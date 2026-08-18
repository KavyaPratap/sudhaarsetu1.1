import * as React from 'react';

export const dynamic = 'force-dynamic';
import { adminDb } from '@/lib/firebase/admin';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import AdminIssueList from './admin-issue-list';

function parsePoint(point: any): { lat: number; lng: number } | null {
  if (!point) return null;
  if (typeof point === 'object' && 'lat' in point && 'lng' in point) return point;
  return null;
}

async function getIssuesAndProfiles() {
  try {
    const issuesSnapshot = await adminDb.collection('issues').get();
    const usersSnapshot = await adminDb.collection('users').get();

    const profilesMap = new Map();
    usersSnapshot.forEach((doc) => {
      profilesMap.set(doc.id, doc.data().full_name || 'Anonymous');
    });

    const formattedIssues: any[] = [];
    issuesSnapshot.forEach((doc) => {
      const data = doc.data();
      formattedIssues.push({
        ...data,
        id: doc.id,
        location: parsePoint(data.location),
        reporter_name: profilesMap.get(data.reportedBy) || 'Anonymous',
      });
    });

    formattedIssues.sort((a, b) => new Date(b.reportedAt || 0).getTime() - new Date(a.reportedAt || 0).getTime());

    return { issues: formattedIssues };
  } catch (error) {
    console.error("Error fetching issues:", error);
    return { issues: [] };
  }
}

export default async function AdminDashboard() {
  const { issues } = await getIssuesAndProfiles();

  const totalIssues = issues.length;
  const pendingIssues = issues.filter(i => i.status === 'Pending').length;
  const resolvedIssues = issues.filter(i => i.status === 'Resolved').length;
  const inProgressIssues = issues.filter(i => i.status === 'In Progress').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIssues}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingIssues}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressIssues}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedIssues}</div>
          </CardContent>
        </Card>
      </div>
      <AdminIssueList allIssues={issues} />
    </div>
  );
}
