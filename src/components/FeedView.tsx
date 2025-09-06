
'use client';

import * as React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter, ArrowDownUp } from 'lucide-react';
import type { Issue } from '@/lib/types';
import IssueList from '@/components/IssueList';
import { useI18n } from '@/context/i18n-context';

type SortOption = 'Newest' | 'Upvotes' | 'Urgency';

interface FeedViewProps {
  issues: Issue[];
  onValidate: (issueId: string, newCounts: { upvotes: number, downvotes: number }) => void;
  onSelectIssue: (issueId: string) => void;
}

export default function FeedView({ issues, onValidate, onSelectIssue }: FeedViewProps) {
  const [categoryFilter, setCategoryFilter] = React.useState<string | 'All'>(
    'All'
  );
  const [sortOption, setSortOption] = React.useState<SortOption>('Urgency');
  const { t } = useI18n();

  const filteredAndSortedIssues = React.useMemo(() => {
    let filtered =
      categoryFilter === 'All'
        ? issues
        : issues.filter(issue => issue.category === categoryFilter);

    switch (sortOption) {
      case 'Newest':
        return [...filtered].sort(
          (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
        );
      case 'Upvotes':
        return [...filtered].sort((a, b) => b.upvotes - a.upvotes);
      case 'Urgency':
        return [...filtered].sort((a,b) => b.urgency_score - a.urgency_score);
      default:
        return filtered;
    }
  }, [issues, categoryFilter, sortOption]);

  const categories = ['All', 'Water', 'Electricity', 'Roads', 'Waste', 'Other'];

  const sortOptions: SortOption[] = ['Urgency', 'Newest', 'Upvotes'];

  return (
    <>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-2xl font-bold tracking-tight">{t('Issue Feed')}</h2>
            <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2" />
                    {t('Filter: ')}{t(categoryFilter)}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                {categories.map(cat => (
                    <DropdownMenuItem key={cat} onSelect={() => setCategoryFilter(cat)}>
                        {t(cat)}
                    </DropdownMenuItem>
                ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <ArrowDownUp className="mr-2" />
                    {t('Sort by: ')}{t(sortOption)}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                {sortOptions.map(option => (
                    <DropdownMenuItem key={option} onSelect={() => setSortOption(option)}>
                        {t(option)}
                    </DropdownMenuItem>
                ))}
                </DropdownMenuContent>
            </DropdownMenu>
            </div>
      </div>
      <IssueList
        issues={filteredAndSortedIssues}
        onValidate={onValidate}
        onSelectIssue={onSelectIssue}
      />
    </>
  );
}
