using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi.Models;
using ResumeAlchemist.Api.Middleware;
using ResumeAlchemist.Core;
using ResumeAlchemist.Infrastructure;
using ResumeAlchemist.Shared.Options;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 配置 Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // 不转义中文等 Unicode 字符
        options.JsonSerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
        // 使用 camelCase 命名
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "简历炼金术 API", Version = "v1" });
});

// 配置 CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? new[] { "http://localhost:5173" })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// 配置 Rate Limiting（限流保护）
var rateLimitOptions = builder.Configuration.GetSection(RateLimitOptions.SectionName).Get<RateLimitOptions>() ?? new RateLimitOptions();

builder.Services.AddRateLimiter(options =>
{
    // 全局限流策略：固定窗口算法
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = rateLimitOptions.PermitLimit,
                Window = TimeSpan.FromSeconds(rateLimitOptions.WindowSeconds),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = rateLimitOptions.QueueLimit
            }));

    // AI 接口专用限流策略：更严格的限制
    options.AddFixedWindowLimiter("ai", limiterOptions =>
    {
        limiterOptions.PermitLimit = rateLimitOptions.AIPermitLimit;
        limiterOptions.Window = TimeSpan.FromSeconds(60);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0; // 不排队，直接拒绝
    });

    // 限流被拒绝时的响应
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterValue)
            ? retryAfterValue.TotalSeconds
            : 60;

        context.HttpContext.Response.Headers.RetryAfter = retryAfter.ToString();

        var response = new
        {
            error = "请求过于频繁，请稍后重试",
            retryAfterSeconds = (int)retryAfter
        };

        await context.HttpContext.Response.WriteAsJsonAsync(response, cancellationToken);
    };
});

// 注册 RateLimitOptions
builder.Services.AddOptions<RateLimitOptions>()
    .Bind(builder.Configuration.GetSection(RateLimitOptions.SectionName))
    .ValidateDataAnnotations();

// 注册 Infrastructure 层服务 (AI 客户端、解析服务等)
builder.Services.AddInfrastructureServices(builder.Configuration);

// 注册 Core 层业务服务
builder.Services.AddCoreServices();

// 注册网站统计服务（Singleton，JSON 文件持久化）
builder.Services.AddSingleton<ResumeAlchemist.Core.Interfaces.ISiteStatsService, ResumeAlchemist.Core.Services.SiteStatsService>();

// 配置 FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "简历炼金术 API v1"));
}

// 全局异常处理中间件（应在其他中间件之前）
app.UseExceptionHandling();

app.UseSerilogRequestLogging();

app.UseCors("AllowFrontend");

// 启用限流中间件
app.UseRateLimiter();

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

try
{
    Log.Information("启动简历炼金术 API...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "应用程序意外终止");
}
finally
{
    Log.CloseAndFlush();
}
