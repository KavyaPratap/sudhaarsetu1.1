
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BarChart, LineChart, PieChart } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>
            Insights into civic issues and department performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 gap-4 text-center">
            <div className="flex items-center gap-4 text-muted-foreground">
                <BarChart className="h-12 w-12" />
                <LineChart className="h-16 w-16 text-primary" />
                <PieChart className="h-12 w-12" />
            </div>
          <h3 className="text-2xl font-bold tracking-tight">
            Analytics Page is Under Construction
          </h3>
          <p className="text-muted-foreground">
            Check back soon for detailed charts and data visualizations.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
