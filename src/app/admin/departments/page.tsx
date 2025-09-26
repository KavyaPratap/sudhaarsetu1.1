
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Building } from 'lucide-react';

export default function DepartmentsPage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            Manage municipal departments and their assignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 gap-4 text-center">
            <Building className="h-16 w-16 text-primary" />
          <h3 className="text-2xl font-bold tracking-tight">
            Department Management is Under Construction
          </h3>
          <p className="text-muted-foreground">
            Soon you will be able to add, edit, and manage departments here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
