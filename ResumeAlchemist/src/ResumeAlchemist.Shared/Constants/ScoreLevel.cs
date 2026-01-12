namespace ResumeAlchemist.Shared.Constants;

/// <summary>
/// 评分等级配置
/// </summary>
public static class ScoreLevel
{
    public static string GetLevel(int score)
    {
        return score switch
        {
            >= 90 => "S",
            >= 80 => "A",
            >= 70 => "B",
            >= 60 => "C",
            _ => "D"
        };
    }

    public static string GetMatchLevel(int score)
    {
        return score switch
        {
            >= 90 => "非常匹配",
            >= 75 => "比较匹配",
            >= 60 => "基本匹配",
            >= 40 => "匹配度较低",
            _ => "不太匹配"
        };
    }
}
