import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useInsights } from "@/hooks/use-insights";

export default function TopInsights() {
  const { insights } = useInsights();

  const getIcon = (key) => {
    switch (key) {
      case 'savings':
        return <TrendingUp className="h-5 w-5 text-success" />;
      case 'food':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'bestWeek':
      default:
        return <TrendingDown className="h-5 w-5 text-accent" />;
    }
  };

  const tileClass = (tone) => (
    `p-3 rounded-lg border flex items-start gap-3 min-w-0 ` +
    (tone === 'success' ? 'bg-success/10 border-success/20' : tone === 'warning' ? 'bg-warning/10 border-warning/20' : 'bg-accent/10 border-accent/20')
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" />
          Top Insights
        </CardTitle>
        <CardDescription>Personalized insights from your transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {insights.map((insight) => (
            <div key={insight.key} className={tileClass(insight.tone)}>
              <div className="mt-0.5 shrink-0">{getIcon(insight.key)}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" title={insight.title}>{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


