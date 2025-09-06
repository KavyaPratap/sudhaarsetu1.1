
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, ListFilter } from 'lucide-react';
import type { Issue } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type SortOption = 'newest' | 'urgency' | 'status';
type ExtendedIssue = Issue & { reporter_name: string };

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
  Rejected: 'bg-red-500/20 text-red-700 border-red-500/30',
  Redirected: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
};

export default function AdminIssueList({ allIssues }: { allIssues: ExtendedIssue[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = searchParams.get('status') ?? 'all';
  const sort = (searchParams.get('sort') as SortOption) ?? 'newest';

  const createQueryString = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  );
  
  const filteredAndSortedIssues = React.useMemo(() => {
    let issues = allIssues;

    if (statusFilter === 'all') {
        issues = allIssues.filter(issue => issue.status !== 'Resolved' && issue.status !== 'Rejected');
    } else {
        issues = allIssues.filter(issue => issue.status === statusFilter);
    }
    
    if (sort === 'urgency') {
        issues = issues.sort((a, b) => b.urgency_score - a.urgency_score);
    } else if (sort === 'status') {
        issues = issues.sort((a, b) => a.status.localeCompare(b.status));
    } else { // 'newest'
        issues = issues.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
    }

    return issues;
  }, [allIssues, statusFilter, sort]);


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
              <CardTitle>All Reported Issues</CardTitle>
              <CardDescription>
              A list of all issues reported by citizens.
              </CardDescription>
          </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                          <ListFilter className="h-3.5 w-3.5" />
                          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Sort
                          </span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem checked={sort === 'newest'} onCheckedChange={() => router.push(pathname + '?' + createQueryString('sort', 'newest'))}>Newest</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={sort === 'urgency'} onCheckedChange={() => router.push(pathname + '?' + createQueryString('sort', 'urgency'))}>Urgency</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={sort === 'status'} onCheckedChange={() => router.push(pathname + '?' + createQueryString('sort', 'status'))}>Status</DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
      </CardHeader>
      <CardContent>
            <Tabs value={statusFilter} onValueChange={(value) => router.push(pathname + '?' + createQueryString('status', value))}>
              <TabsList>
                  <TabsTrigger value="all">Active</TabsTrigger>
                  <TabsTrigger value="Pending">Pending</TabsTrigger>
                  <TabsTrigger value="In Progress">In Progress</TabsTrigger>
                  <TabsTrigger value="Redirected">Redirected</TabsTrigger>
                  <TabsTrigger value="Resolved">Resolved</TabsTrigger>
                  <TabsTrigger value="Rejected">Rejected</TabsTrigger>
              </TabsList>
          </Tabs>
          <div className="mt-4">
          <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="hidden md:table-cell">Reported By</TableHead>
                  <TableHead className="hidden md:table-cell">Reported</TableHead>
                  <TableHead>
                      <span className="sr-only">Actions</span>
                  </TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredAndSortedIssues.map(issue => (
                  <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.title}</TableCell>
                      <TableCell>
                            <Badge variant="outline" className={statusColors[issue.status]}>{issue.status}</Badge>
                      </TableCell>
                      <TableCell>{issue.urgency_score}/100</TableCell>
                      <TableCell>{issue.department}</TableCell>
                      <TableCell className="hidden md:table-cell">{issue.reporter_name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                          {formatDistanceToNow(new Date(issue.reportedAt), { addSuffix: true })}
                      </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/issue/${issue.id}`}>
                                  View <ArrowUpRight className="h-4 w-4 ml-2"/>
                              </Link>
                          </Button>
                      </TableCell>
                  </TableRow>
                  ))}
              </TableBody>
          </Table>
          </div>
      </CardContent>
    </Card>
  );
}
