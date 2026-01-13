using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.OpenApi.Models;
using ResumeAlchemist.Api.Middleware;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Core.Services;
using ResumeAlchemist.Infrastructure.AI;
using ResumeAlchemist.Infrastructure.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 配置 Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
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

// 配置 HttpClient for AI
builder.Services.AddHttpClient<IZhipuAIClient, ZhipuAIClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["ZhipuAI:BaseUrl"] ?? "https://open.bigmodel.cn/api/paas/v4/");
    client.Timeout = TimeSpan.FromSeconds(120);
});

// 注册业务服务 (Core层)
builder.Services.AddScoped<IResumeAnalyzerService, ResumeAnalyzerService>();
builder.Services.AddScoped<IResumePolisherService, ResumePolisherService>();
builder.Services.AddScoped<IJDMatcherService, JDMatcherService>();
builder.Services.AddScoped<IInterviewPredictorService, InterviewPredictorService>();

// 注册基础设施服务 (Infrastructure层)
builder.Services.AddScoped<IResumeParserService, ResumeParserService>();

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
