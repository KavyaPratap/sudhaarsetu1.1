
import * as React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Issue, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import AdminIssueList from './admin-issue-list';

function parsePoint(point: any): { lat: number; lng: number } | null {
  if (!point) return null;

  // Case 1: It's already a valid object { lat, lng }
  if (typeof point === 'object' && 'lat' in point && 'lng' in point) {
    return point;
  }
  
  // Case 2: It's the new format from Supabase RPC with PostGIS: { type: 'Point', coordinates: [lng, lat] }
  if (typeof point === 'object' && point.type === 'Point' && Array.isArray(point.coordinates)) {
    const [lng, lat] = point.coordinates;
     if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // Case 3: It's a string from a raw query 'POINT(lng lat)'
  if (typeof point === 'string') {
    const match = point.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  
  console.warn("Could not parse point:", point);
  return null;
}

async function getIssuesAndProfiles() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data: issuesData, error: issuesError } = await supabase
        .from('issues')
        .select('*')
        .order('reportedAt', { ascending: false });

    if (issuesError) {
        console.error("Error fetching issues:", issuesError);
        return { issues: [], profilesMap: new Map() };
    }

    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');
    
    if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
    }
    
    const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name || 'Anonymous']));

    const formattedIssues = issuesData.map(issue => ({
        ...issue,
        location: parsePoint(issue.location),
        reporter_name: profilesMap.get(issue.reportedBy) || 'Anonymous'
    }));

    return { issues: formattedIssues };
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
