'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfYear, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Users, FolderKanban, CheckSquare, Euro, Target, Ticket, Kanban } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type StatMetricKey =
  | 'totalContacts'
  | 'pipelineDeals'
  | 'conversionRate'
  | 'totalProjects'
  | 'activeTasks'
  | 'totalRevenue'
  | 'ticketsActive';

interface DealActivitySeriesPayload {
  granularity: 'day' | 'week';
  buckets: Array<{
    periodStart: string;
    dealsCreated: number;
    dealsWonClosed: number;
    dealsLostClosed: number;
    revenueWonClosed: number;
  }>;
}

interface TicketActivitySeriesPayload {
  granularity: 'day' | 'week';
  buckets: Array<{
    periodStart: string;
    created: number;
    resolved: number;
    closed: number;
  }>;
}

interface TicketActivityDrilldownResult {
  period: { from: string; to: string };
  bucket: {
    periodStart: string;
    granularity: 'day' | 'week';
    activity: 'created' | 'resolved' | 'closed';
  };
  items: Array<{
    id: string;
    ticketNumber: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    resolvedAt: string | null;
    closedAt: string | null;
  }>;
}

interface Stats {
  totalContacts: number;
  totalDeals: number;
  pipelineDeals: number;
  wonDeals: number;
  conversionRate: number;
  dealStages: Record<string, number>;
  totalProjects: number;
  activeTasks: number;
  totalRevenue: number;
  ticketsOpen: number;
  ticketsInProgress: number;
  ticketsActive: number;
  period: { from: string; to: string } | null;
  dealActivitySeries: DealActivitySeriesPayload | null;
  ticketActivitySeries: TicketActivitySeriesPayload | null;
}

interface DrilldownResult {
  metric: StatMetricKey;
  period: { from: string; to: string } | null;
  items: Array<Record<string, unknown>>;
}

function drilldownHref(metric: StatMetricKey, row: Record<string, unknown>): string | null {
  const id = typeof row.id === 'string' ? row.id : null;
  if (!id) return null;
  switch (metric) {
    case 'totalContacts':
      return `/contacts/${id}`;
    case 'pipelineDeals':
    case 'conversionRate':
    case 'totalRevenue':
      return `/deals/${id}`;
    case 'totalProjects':
      return `/projects/${id}`;
    case 'activeTasks':
      return `/tasks/${id}`;
    case 'ticketsActive':
      return `/tickets/${id}`;
    default:
      return null;
  }
}

type StatsPreset = 'all' | '7d' | '30d' | '90d' | 'ytd';

const PRESETS: { id: StatsPreset; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: '7d', label: '7 j.' },
  { id: '30d', label: '30 j.' },
  { id: '90d', label: '90 j.' },
  { id: 'ytd', label: 'Année' },
];

const DEAL_STAGE_ORDER = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

const DEAL_STAGE_LABELS: Record<(typeof DEAL_STAGE_ORDER)[number], string> = {
  lead: 'Prospect',
  qualified: 'Qualifié',
  proposal: 'Proposition',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
};

function statsRangeParams(preset: StatsPreset): { from: string; to: string } | undefined {
  if (preset === 'all') return undefined;
  const to = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();
  switch (preset) {
    case '7d':
      return { from: format(subDays(now, 6), 'yyyy-MM-dd'), to };
    case '30d':
      return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to };
    case '90d':
      return { from: format(subDays(now, 89), 'yyyy-MM-dd'), to };
    case 'ytd':
      return { from: format(startOfYear(now), 'yyyy-MM-dd'), to };
    default:
      return undefined;
  }
}

function seriesTickLabel(isoDay: string, granularity: 'day' | 'week'): string {
  const d = parseISO(isoDay);
  return granularity === 'day'
    ? format(d, 'd MMM.', { locale: fr })
    : `Sem. ${format(d, 'd MMM.', { locale: fr })}`;
}

const statCards: ReadonlyArray<{
  key: StatMetricKey;
  label: string;
  icon: typeof Users;
  color: string;
  bg: string;
  suffix?: string;
  format?: 'currency';
  hints: { all: string; period: string };
}> = [
  {
    key: 'totalContacts',
    label: 'Contacts',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    hints: {
      all: '' as string,
      period: 'Contacts créés sur la période.',
    },
  },
  {
    key: 'pipelineDeals',
    label: 'Pipeline (non terminé)',
    icon: Kanban,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    hints: {
      all: '',
      period: 'Deals créés sur la période encore ouverts (hors gagné / perdu).',
    },
  },
  {
    key: 'conversionRate',
    label: 'Taux de conversion',
    icon: Target,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
    suffix: '%',
    hints: {
      all: 'Deals gagnés / tous les deals',
      period: 'Gagnés clos / (gagnés clos + perdus clos)',
    },
  },
  {
    key: 'totalProjects',
    label: 'Projets',
    icon: FolderKanban,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    hints: {
      all: '',
      period: 'Projets créés sur la période.',
    },
  },
  {
    key: 'activeTasks',
    label: 'Tâches en cours',
    icon: CheckSquare,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    hints: {
      all: '',
      period: 'Tâches créées sur la période, encore non terminées.',
    },
  },
  {
    key: 'totalRevenue',
    label: "Chiffre d'affaires",
    icon: Euro,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    format: 'currency' as const,
    hints: {
      all: 'Somme des deals gagnés',
      period: 'Somme des deals clos gagnés sur la période',
    },
  },
  {
    key: 'ticketsActive',
    label: 'Tickets actifs',
    icon: Ticket,
    color: 'text-sky-600',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    hints: {
      all: 'Ouverts + en cours',
      period: 'Créés sur la période, encore ouverts ou en traitement.',
    },
  },
];

export function DashboardStats() {
  const [preset, setPreset] = useState<StatsPreset>('30d');
  const [selectedMetric, setSelectedMetric] = useState<StatMetricKey | null>(null);
  const [ticketBucket, setTicketBucket] = useState<{
    periodStart: string;
    activity: 'created' | 'resolved' | 'closed';
  } | null>(null);
  const range = useMemo(() => statsRangeParams(preset), [preset]);

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats', preset, range?.from ?? 'all', range?.to ?? 'all'],
    queryFn: async () =>
      (await api.get('/organizations/stats', {
        params: range ? { from: range.from, to: range.to } : {},
      })) as Stats,
  });

  const { data: drilldown, isLoading: drilldownLoading } = useQuery<DrilldownResult>({
    queryKey: [
      'stats-drilldown',
      selectedMetric ?? 'none',
      range?.from ?? 'all',
      range?.to ?? 'all',
    ],
    enabled: Boolean(selectedMetric),
    queryFn: async () =>
      (await api.get('/organizations/stats/drilldown', {
        params: {
          metric: selectedMetric,
          ...(range ? { from: range.from, to: range.to } : {}),
          limit: 12,
        },
      })) as DrilldownResult,
  });

  const { data: ticketDrilldown, isLoading: ticketDrilldownLoading } =
    useQuery<TicketActivityDrilldownResult>({
      queryKey: [
        'stats-ticket-bucket-drilldown',
        ticketBucket?.periodStart ?? 'none',
        ticketBucket?.activity ?? 'none',
        stats?.ticketActivitySeries?.granularity ?? 'day',
      ],
      enabled: Boolean(ticketBucket && stats?.ticketActivitySeries?.granularity),
      queryFn: async () =>
        (await api.get('/organizations/stats/tickets-activity-drilldown', {
          params: {
            periodStart: ticketBucket?.periodStart,
            granularity: stats?.ticketActivitySeries?.granularity ?? 'day',
            activity: ticketBucket?.activity,
            limit: 20,
          },
        })) as TicketActivityDrilldownResult,
    });

  const stageChartData = useMemo(() => {
    if (!stats?.dealStages) return [];
    return DEAL_STAGE_ORDER.map((stage) => ({
      stage: DEAL_STAGE_LABELS[stage],
      count: stats.dealStages[stage] ?? 0,
    }));
  }, [stats?.dealStages]);

  const activitySeriesData = useMemo(() => {
    const payload = stats?.dealActivitySeries;
    if (!payload?.buckets.length) return [];
    return payload.buckets.map((b) => ({
      ...b,
      label: seriesTickLabel(b.periodStart, payload.granularity),
      revenueRounded: Number(b.revenueWonClosed.toFixed(2)),
    }));
  }, [stats?.dealActivitySeries]);

  const hasSeriesActivity = activitySeriesData.some(
    (b) =>
      b.dealsCreated > 0 || b.dealsWonClosed > 0 || b.dealsLostClosed > 0 || b.revenueWonClosed > 0,
  );

  const ticketSeriesData = useMemo(() => {
    const payload = stats?.ticketActivitySeries;
    if (!payload?.buckets.length) return [];
    return payload.buckets.map((b) => ({
      ...b,
      label: seriesTickLabel(b.periodStart, payload.granularity),
    }));
  }, [stats?.ticketActivitySeries]);

  const hasTicketSeriesActivity = ticketSeriesData.some(
    (b) => b.created > 0 || b.resolved > 0 || b.closed > 0,
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full max-w-md rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  const isPeriodView = Boolean(stats?.period);
  const seriesGranularityLabel =
    stats?.dealActivitySeries?.granularity === 'week' ? 'Semaines (lun. UTC)' : 'Jours calendaires UTC';

  const periodBanner =
    stats?.period &&
    `${format(parseISO(stats.period.from), 'd MMMM yyyy', { locale: fr })} — ${format(parseISO(stats.period.to), 'd MMMM yyyy', { locale: fr })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                preset === p.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periodBanner ? (
          <p className="text-xs text-muted-foreground sm:text-right max-w-md">
            Période : <span className="text-foreground font-medium">{periodBanner}</span> (UTC)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground sm:text-right">Vue globale (toutes les données)</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map(({ key, label, icon: Icon, color, bg, suffix, format: fmt, hints }) => {
          const value = stats?.[key];
          let displayValue = '';

          if (fmt === 'currency') {
            displayValue = formatCurrency(Number(value ?? 0));
          } else if (suffix) {
            displayValue = `${value}${suffix}`;
          } else {
            displayValue = String(value ?? 0);
          }

          const hint = isPeriodView ? hints.period : hints.all || undefined;

          return (
            <div key={key} className="rounded-xl border bg-card p-4 space-y-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{displayValue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                {hint ? (
                  <p className="text-[10px] text-muted-foreground/80 mt-1 leading-tight">{hint}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedMetric((prev) => (prev === key ? null : key))}
                  className="text-[11px] text-primary hover:underline mt-2"
                >
                  {selectedMetric === key ? 'Masquer détails' : 'Voir détails'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMetric && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-semibold">Drill-down KPI</p>
            <p className="text-xs text-muted-foreground">
              {statCards.find((c) => c.key === selectedMetric)?.label}
            </p>
          </div>
          {drilldownLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des détails…</p>
          ) : !drilldown || drilldown.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée sur ce segment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    {Object.keys(drilldown.items[0]).map((k) => (
                      <th key={k} className="text-left font-medium px-2 py-2 whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                    <th className="text-left font-medium px-2 py-2 whitespace-nowrap">action</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldown.items.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      {Object.keys(drilldown.items[0]).map((k) => (
                        <td key={k} className="px-2 py-2 whitespace-nowrap">
                          {String(row[k] ?? '')}
                        </td>
                      ))}
                      <td className="px-2 py-2 whitespace-nowrap">
                        {drilldownHref(selectedMetric, row) ? (
                          <Link
                            href={drilldownHref(selectedMetric, row) as string}
                            className="text-primary hover:underline"
                          >
                            Ouvrir
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isPeriodView && stats?.dealActivitySeries && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Activité deals sur la période</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 mb-3">
            Créations (barres) et clôtures gagnées / perdues ; courbe = CA des gagnés clos par {seriesGranularityLabel}.
          </p>
          {!hasSeriesActivity ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Aucun mouvement sur cette fenêtre.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={activitySeriesData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  yAxisId="count"
                  allowDecimals={false}
                  width={36}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  yAxisId="money"
                  orientation="right"
                  width={48}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${Number(v) >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => {
                    if (name === 'CA gagnés') return [formatCurrency(value), name];
                    return [`${value}`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="count" dataKey="dealsCreated" name="Créés" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="count" dataKey="dealsWonClosed" name="Gagnés clos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="count" dataKey="dealsLostClosed" name="Perdus clos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="revenueRounded"
                  name="CA gagnés"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {isPeriodView && stats?.ticketActivitySeries && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Activité tickets sur la période</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 mb-3">
            Tickets créés, résolus et fermés par {seriesGranularityLabel}.
          </p>
          {!hasTicketSeriesActivity ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune activité ticket sur cette fenêtre.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={ticketSeriesData}
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} width={36} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="created"
                  name="Créés"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  onClick={(d: { periodStart: string }) =>
                    setTicketBucket({ periodStart: d.periodStart, activity: 'created' })
                  }
                />
                <Bar
                  dataKey="resolved"
                  name="Résolus"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  onClick={(d: { periodStart: string }) =>
                    setTicketBucket({ periodStart: d.periodStart, activity: 'resolved' })
                  }
                />
                <Bar
                  dataKey="closed"
                  name="Fermés"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  onClick={(d: { periodStart: string }) =>
                    setTicketBucket({ periodStart: d.periodStart, activity: 'closed' })
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          {ticketBucket && (
            <div className="mt-4 border-t pt-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-medium">
                  Détail tickets — {ticketBucket.activity} @ {ticketBucket.periodStart}
                </p>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setTicketBucket(null)}
                >
                  Fermer
                </button>
              </div>
              {ticketDrilldownLoading ? (
                <p className="text-xs text-muted-foreground">Chargement…</p>
              ) : !ticketDrilldown || ticketDrilldown.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun ticket pour ce bucket.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left px-2 py-2">#</th>
                        <th className="text-left px-2 py-2">Titre</th>
                        <th className="text-left px-2 py-2">Statut</th>
                        <th className="text-left px-2 py-2">Priorité</th>
                        <th className="text-left px-2 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketDrilldown.items.map((t) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="px-2 py-2 whitespace-nowrap">{t.ticketNumber}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{t.title}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{t.status}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{t.priority}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <Link href={`/tickets/${t.id}`} className="text-primary hover:underline">
                              Ouvrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {stats?.dealStages && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Répartition par étape</p>
            <p className="text-[10px] text-muted-foreground mb-2">
              {isPeriodView
                ? 'Deals créés sur la période — état actuel du pipeline pour ces entrées.'
                : 'Tous les deals — répartition par étape actuelle.'}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
              {DEAL_STAGE_ORDER.map((stage) => (
                <span key={stage} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{DEAL_STAGE_LABELS[stage]}</span>
                  {' · '}
                  {stats.dealStages[stage] ?? 0}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {isPeriodView ? (
                <>
                  Nouveaux deals sur la fenêtre : {stats.totalDeals} · Clôtures gagnées (clos) : {stats.wonDeals}
                </>
              ) : (
                <>
                  Deals en base : {stats.totalDeals} (dont {stats.wonDeals} gagnés)
                </>
              )}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 min-h-[220px]">
            <p className="text-xs font-medium text-muted-foreground mb-1">Synthèse visuelle</p>
            <p className="text-[10px] text-muted-foreground mb-2">
              Volume par étape{isPeriodView ? ' pour les nouveaux deals de la fenêtre.' : '.'}
            </p>
            {stageChartData.length > 0 && stageChartData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stageChartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}`, 'Nombre']}
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Nombre" radius={[6, 6, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucun deal dans cette série.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
