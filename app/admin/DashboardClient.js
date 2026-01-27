'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshButton } from "@/components/RefreshButton";
import { PageTransition, SlideIn } from "@/components/PageTransition";
import { SkeletonCard } from "@/components/ui/loading";
import {
    FileText,
    Trash2,
    Star,
    Bell,
    TrendingUp,
    Calendar,
    Activity,
    Target,
    Clock
} from "lucide-react";
import { ChartComponent } from "./Chart";
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { setCache, getCache } from "@/lib/cache";

export default function DashboardClient({ initialStats, initialChart, initialProductivity, error: initialError }) {
    const [stats, setStats] = useState(initialStats);
    const [chartData, setChartData] = useState(initialChart);
    const [productivity, setProductivity] = useState(initialProductivity);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(initialError);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // Cache initial data on mount
    useEffect(() => {
        if (initialStats) setCache('dashboardStats', initialStats, 15);
        if (initialChart) setCache('dashboardChart', initialChart, 15);
        if (initialProductivity) setCache('dashboardProductivity', initialProductivity, 15);
    }, [initialStats, initialChart, initialProductivity]);

    // Refresh chart data when year changes
    useEffect(() => {
        refreshData(selectedYear);
    }, [selectedYear]);

    const refreshData = async (year = selectedYear) => {
        setLoading(true);
        setError(null);
        try {
            const [statsRes, chartRes, productivityRes] = await Promise.all([
                fetch('/api/dashboard/stats', { cache: 'no-store' }),
                fetch(`/api/notes/chart?year=${year}`, { cache: 'no-store' }),
                fetch('/api/dashboard/productivity', { cache: 'no-store' })
            ]);

            const [newStats, newChart, newProductivity] = await Promise.all([
                statsRes.json(),
                chartRes.json(),
                productivityRes.json()
            ]);

            // Update state
            setStats(newStats);
            setChartData(newChart);
            setProductivity(newProductivity);

            // Update cache
            setCache('dashboardStats', newStats, 15);
            setCache('dashboardChart', newChart, 15);
            setCache('dashboardProductivity', newProductivity, 15);
        } catch (err) {
            console.error('Error refreshing dashboard:', err);
            const errorMsg = err.message.includes('EAI_AGAIN') || err.message.includes('fetch failed') || err.message.includes('ETIMEDOUT')
                ? 'Unable to connect to database. Please check your internet connection.'
                : 'Error loading dashboard data. Please try again.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!stats) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    const StatCard = ({ title, value, icon: Icon, trend, color = "text-primary" }) => (
        <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
            </CardContent>
        </Card>
    );

    return (
        <PageTransition>
            <div className="w-full p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
                    </div>
                    <RefreshButton onRefresh={refreshData} />
                </div>

                {/* Error Message */}
                {error && (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <Activity className="h-5 w-5" />
                                <p className="font-medium">{error}</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Click the refresh button to try again when your connection is restored.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <SlideIn delay={0.1}>
                        <StatCard
                            title="Total Notes"
                            value={stats.totalNotes}
                            icon={FileText}
                            trend={`+${stats.notesToday} today`}
                            color="text-blue-600"
                        />
                    </SlideIn>
                    <SlideIn delay={0.2}>
                        <StatCard
                            title="Favorites"
                            value={stats.totalFavorites}
                            icon={Star}
                            color="text-yellow-600"
                        />
                    </SlideIn>
                    <SlideIn delay={0.3}>
                        <StatCard
                            title="This Week"
                            value={stats.notesThisWeek}
                            icon={TrendingUp}
                            trend="Last 7 days"
                            color="text-green-600"
                        />
                    </SlideIn>
                    <SlideIn delay={0.4}>
                        <StatCard
                            title="Notifications"
                            value={stats.totalNotifications}
                            icon={Bell}
                            color="text-purple-600"
                        />
                    </SlideIn>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    {/* Notes Activity Chart */}
                    <SlideIn delay={0.5} className="min-w-0">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <div>
                                    <CardTitle>Notes Activity</CardTitle>
                                    <CardDescription>Monthly note creation trends</CardDescription>
                                </div>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    disabled={loading}
                                >
                                    {Array.from({ length: 10 }, (_, i) => {
                                        const year = new Date().getFullYear() - i;
                                        return <option key={year} value={year}>{year}</option>;
                                    })}
                                </select>
                            </CardHeader>
                            <CardContent className="min-w-0">
                                <div className="w-full">
                                    <ChartComponent chartData={chartData} />
                                </div>
                            </CardContent>
                        </Card>
                    </SlideIn>

                    {/* Weekly Productivity */}
                    <SlideIn delay={0.6} className="min-w-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>7-Day Activity</CardTitle>
                                <CardDescription>Your productivity this week</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {productivity.map((day, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{day.date}</span>
                                            <span className="text-muted-foreground">{day.count} notes</span>
                                        </div>
                                        <Progress value={(day.count / Math.max(...productivity.map(d => d.count)) * 100) || 0} className="h-2" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </SlideIn>
                </div>

                {/* Bottom Grid */}
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {/* Recent Notes */}
                    <SlideIn delay={0.7} className="min-w-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Recent Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {stats.recentNotes.length > 0 ? (
                                        stats.recentNotes.map(note => (
                                            <Link
                                                href="/admin/note"
                                                key={note.id}
                                                className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{note.title}</p>
                                                        <p className="text-xs text-muted-foreground">{note.created_at}</p>
                                                    </div>
                                                    {note.fav && <Star className="h-4 w-4 text-yellow-600 flex-shrink-0 ml-2" />}
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No recent notes</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </SlideIn>

                    {/* Upcoming Targets */}
                    <SlideIn delay={0.8} className="min-w-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5" />
                                    Upcoming Targets
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {stats.upcomingTargets && stats.upcomingTargets.length > 0 ? (
                                        stats.upcomingTargets.map(target => (
                                            <Link
                                                href="/admin/target"
                                                key={target.id}
                                                className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{target.name}</p>
                                                        <p className="text-xs text-muted-foreground">{target.targetdate}</p>
                                                    </div>
                                                    <span className="text-sm font-semibold">{target.leftdays}d</span>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No upcoming targets</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </SlideIn>
                </div>

                {/* Quick Actions */}
                <SlideIn delay={0.9}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Common tasks at your fingertips</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Link
                                    href="/admin/note"
                                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <FileText className="h-8 w-8 mb-2" />
                                    <span className="text-sm font-medium">New Note</span>
                                </Link>
                                <Link
                                    href="/admin/inbox"
                                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <Bell className="h-8 w-8 mb-2" />
                                    <span className="text-sm font-medium">Inbox</span>
                                </Link>
                                <Link
                                    href="/admin/target"
                                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <Calendar className="h-8 w-8 mb-2" />
                                    <span className="text-sm font-medium">Targets</span>
                                </Link>
                                <Link
                                    href="/admin/settings"
                                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <Activity className="h-8 w-8 mb-2" />
                                    <span className="text-sm font-medium">Settings</span>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </SlideIn>
            </div>
        </PageTransition>
    );
}
