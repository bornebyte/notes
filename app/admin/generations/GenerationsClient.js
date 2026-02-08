'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Download,
    Eye,
    FileText,
    Filter,
    RefreshCw,
    Search,
    Server,
    Users,
    X,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Loader2,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "@/hooks/use-toast";
import { buildPPTAPIUrl, getPPTAPIHeaders } from '@/lib/api/config';

const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100, 200];

export default function GenerationsClient({ initialData, initialError, apiStatus }) {
    const [data, setData] = useState(initialData);
    const [error, setError] = useState(initialError);
    const [loading, setLoading] = useState(false);
    const [exportingData, setExportingData] = useState(false);
    const [selectedGeneration, setSelectedGeneration] = useState(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Filters
    const [filters, setFilters] = useState({
        q: '',
        status: '',
        student_type: '',
        file_name: '',
        college_name: '',
        presentation_title: '',
        professor_name: '',
        student_name: '',
        student_usn: '',
        course: '',
        semester: '',
        min_slides: '',
        max_slides: '',
        start: '',
        end: '',
        has_tables: '',
        has_images: '',
        has_charts: '',
        sort_by: 'timestamp',
        sort_dir: 'desc',
    });

    const [tempFilters, setTempFilters] = useState(filters);

    // Calculate pagination
    const totalPages = Math.ceil((data?.total || 0) / itemsPerPage);
    const offset = (currentPage - 1) * itemsPerPage;

    // Fetch data with filters
    const fetchData = useCallback(async (showLoadingIndicator = true) => {
        if (showLoadingIndicator) setLoading(true);
        setError(null);

        try {
            const params = {
                limit: itemsPerPage,
                offset: offset,
                ...filters,
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined || params[key] === 'all') {
                    delete params[key];
                }
            });

            const queryParams = new URLSearchParams(params);
            const url = buildPPTAPIUrl(`/api/generations?${queryParams.toString()}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: getPPTAPIHeaders(),
                cache: 'no-store',
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized: Invalid API key');
                }
                if (response.status === 404) {
                    throw new Error('API endpoint not found. Please check the configuration.');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            const result = await response.json();

            if (!result || typeof result.total !== 'number' || !Array.isArray(result.items)) {
                throw new Error('Invalid response format from API');
            }

            setData(result);

            if (showLoadingIndicator) {
                toast({
                    title: "Data refreshed",
                    description: `Found ${result.total} generation${result.total !== 1 ? 's' : ''}`,
                });
            }
        } catch (err) {
            console.error('Error fetching generations:', err);

            let errorMessage = 'Failed to load data';
            if (err.name === 'AbortError' || err.name === 'TimeoutError') {
                errorMessage = 'Request timeout. The server is taking too long to respond.';
            } else if (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND')) {
                errorMessage = 'Network error. Unable to connect to PPT API server.';
            } else if (err.message.includes('ECONNREFUSED')) {
                errorMessage = 'Connection refused. PPT API server is not running.';
            } else {
                errorMessage = err.message;
            }

            setError(errorMessage);
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            if (showLoadingIndicator) setLoading(false);
        }
    }, [filters, itemsPerPage, offset]);

    // Fetch generation detail
    const fetchGenerationDetail = async (id) => {
        try {
            const url = buildPPTAPIUrl(`/api/generations/${id}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: getPPTAPIHeaders(),
                cache: 'no-store',
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Generation not found');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch details');
            }

            const detail = await response.json();
            setSelectedGeneration(detail);
            setShowDetailDialog(true);
        } catch (err) {
            toast({
                title: "Error",
                description: err.message || 'Failed to fetch generation details',
                variant: "destructive",
            });
        }
    };

    // Export data
    const handleExport = async (format = 'csv') => {
        setExportingData(true);
        try {
            const params = { ...filters, format, limit: 5000 };

            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined || params[key] === 'all') {
                    delete params[key];
                }
            });

            const queryParams = new URLSearchParams(params);
            const url = buildPPTAPIUrl(`/api/generations/export?${queryParams.toString()}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: getPPTAPIHeaders(),
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Export failed');
            }

            if (format === 'csv') {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `generations_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);
            } else {
                const jsonData = await response.json();
                const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `generations_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);
            }

            toast({
                title: "Export successful",
                description: `Data exported as ${format.toUpperCase()}`,
            });
        } catch (err) {
            toast({
                title: "Export failed",
                description: err.message || 'Failed to export data',
                variant: "destructive",
            });
        } finally {
            setExportingData(false);
        }
    };

    // Apply filters
    const applyFilters = () => {
        setFilters(tempFilters);
        setCurrentPage(1);
        setShowFilters(false);
    };

    // Reset filters
    const resetFilters = () => {
        const defaultFilters = {
            q: '',
            status: '',
            student_type: '',
            file_name: '',
            college_name: '',
            presentation_title: '',
            professor_name: '',
            student_name: '',
            student_usn: '',
            course: '',
            semester: '',
            min_slides: '',
            max_slides: '',
            start: '',
            end: '',
            has_tables: '',
            has_images: '',
            has_charts: '',
            sort_by: 'timestamp',
            sort_dir: 'desc',
        };
        setTempFilters(defaultFilters);
        setFilters(defaultFilters);
        setCurrentPage(1);
    };

    // Auto-refresh data when filters or pagination changes
    useEffect(() => {
        if (!initialError) {
            fetchData(false);
        }
    }, [filters, currentPage, itemsPerPage]);

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    // Get status badge variant
    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'success':
                return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
            case 'failed':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            case 'processing':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Processing</Badge>;
            default:
                return <Badge variant="outline">{status || 'Unknown'}</Badge>;
        }
    };

    return (
        <PageTransition>
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">PPT Generations</h1>
                        <p className="text-muted-foreground">
                            View and manage presentation generation records
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={apiStatus === 'healthy' ? 'default' : 'destructive'} className="text-xs">
                            <Server className="w-3 h-3 mr-1" />
                            {apiStatus === 'healthy' ? 'API Online' : 'API Offline'}
                        </Badge>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-destructive">Error Loading Data</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                                    <Button
                                        onClick={() => fetchData()}
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Cards */}
                {!error && data && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Generations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.total?.toLocaleString() || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Current Page
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {currentPage} of {totalPages}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Showing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {data.items?.length || 0} items
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Controls */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={() => setShowFilters(!showFilters)}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Filter className="w-4 h-4 mr-2" />
                                    {showFilters ? 'Hide' : 'Show'} Filters
                                </Button>
                                <Button
                                    onClick={() => fetchData()}
                                    variant="outline"
                                    size="sm"
                                    disabled={loading}
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                                <Button
                                    onClick={() => handleExport('csv')}
                                    variant="outline"
                                    size="sm"
                                    disabled={exportingData || !data?.items?.length}
                                >
                                    {exportingData ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Export CSV
                                </Button>
                                <Button
                                    onClick={() => handleExport('json')}
                                    variant="outline"
                                    size="sm"
                                    disabled={exportingData || !data?.items?.length}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export JSON
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="itemsPerPage" className="text-sm whitespace-nowrap">
                                    Items per page:
                                </Label>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={(value) => {
                                        setItemsPerPage(parseInt(value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEMS_PER_PAGE_OPTIONS.map(option => (
                                            <SelectItem key={option} value={option.toString()}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <div className="mt-6 pt-6 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Global Search */}
                                    <div className="lg:col-span-3">
                                        <Label htmlFor="globalSearch">Global Search</Label>
                                        <Input
                                            id="globalSearch"
                                            placeholder="Search across all fields..."
                                            value={tempFilters.q}
                                            onChange={(e) => setTempFilters({ ...tempFilters, q: e.target.value })}
                                        />
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={tempFilters.status || 'all'}
                                            onValueChange={(value) => setTempFilters({ ...tempFilters, status: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All statuses</SelectItem>
                                                <SelectItem value="success">Success</SelectItem>
                                                <SelectItem value="failed">Failed</SelectItem>
                                                <SelectItem value="processing">Processing</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Student Type */}
                                    <div>
                                        <Label htmlFor="studentType">Student Type</Label>
                                        <Select
                                            value={tempFilters.student_type || 'all'}
                                            onValueChange={(value) => setTempFilters({ ...tempFilters, student_type: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All types</SelectItem>
                                                <SelectItem value="single">Single</SelectItem>
                                                <SelectItem value="group">Group</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <Label htmlFor="sortBy">Sort By</Label>
                                        <Select
                                            value={tempFilters.sort_by}
                                            onValueChange={(value) => setTempFilters({ ...tempFilters, sort_by: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="timestamp">Timestamp</SelectItem>
                                                <SelectItem value="file_name">File Name</SelectItem>
                                                <SelectItem value="title">Title</SelectItem>
                                                <SelectItem value="num_slides">Number of Slides</SelectItem>
                                                <SelectItem value="file_size">File Size</SelectItem>
                                                <SelectItem value="generation_time">Generation Time</SelectItem>
                                                <SelectItem value="status">Status</SelectItem>
                                                <SelectItem value="college_name">College Name</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* College Name */}
                                    <div>
                                        <Label htmlFor="collegeName">College Name</Label>
                                        <Input
                                            id="collegeName"
                                            placeholder="Filter by college..."
                                            value={tempFilters.college_name}
                                            onChange={(e) => setTempFilters({ ...tempFilters, college_name: e.target.value })}
                                        />
                                    </div>

                                    {/* Professor Name */}
                                    <div>
                                        <Label htmlFor="professorName">Professor Name</Label>
                                        <Input
                                            id="professorName"
                                            placeholder="Filter by professor..."
                                            value={tempFilters.professor_name}
                                            onChange={(e) => setTempFilters({ ...tempFilters, professor_name: e.target.value })}
                                        />
                                    </div>

                                    {/* Student Name */}
                                    <div>
                                        <Label htmlFor="studentName">Student Name</Label>
                                        <Input
                                            id="studentName"
                                            placeholder="Filter by student..."
                                            value={tempFilters.student_name}
                                            onChange={(e) => setTempFilters({ ...tempFilters, student_name: e.target.value })}
                                        />
                                    </div>

                                    {/* Course */}
                                    <div>
                                        <Label htmlFor="course">Course</Label>
                                        <Input
                                            id="course"
                                            placeholder="e.g., BCA, MCA"
                                            value={tempFilters.course}
                                            onChange={(e) => setTempFilters({ ...tempFilters, course: e.target.value })}
                                        />
                                    </div>

                                    {/* Semester */}
                                    <div>
                                        <Label htmlFor="semester">Semester</Label>
                                        <Input
                                            id="semester"
                                            placeholder="e.g., 5th, 6th"
                                            value={tempFilters.semester}
                                            onChange={(e) => setTempFilters({ ...tempFilters, semester: e.target.value })}
                                        />
                                    </div>

                                    {/* Date Range */}
                                    <div>
                                        <Label htmlFor="startDate">Start Date</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={tempFilters.start}
                                            onChange={(e) => setTempFilters({ ...tempFilters, start: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={tempFilters.end}
                                            onChange={(e) => setTempFilters({ ...tempFilters, end: e.target.value })}
                                        />
                                    </div>

                                    {/* Min/Max Slides */}
                                    <div>
                                        <Label htmlFor="minSlides">Min Slides</Label>
                                        <Input
                                            id="minSlides"
                                            type="number"
                                            placeholder="Min"
                                            value={tempFilters.min_slides}
                                            onChange={(e) => setTempFilters({ ...tempFilters, min_slides: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="maxSlides">Max Slides</Label>
                                        <Input
                                            id="maxSlides"
                                            type="number"
                                            placeholder="Max"
                                            value={tempFilters.max_slides}
                                            onChange={(e) => setTempFilters({ ...tempFilters, max_slides: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button onClick={applyFilters} size="sm">
                                        <Search className="w-4 h-4 mr-2" />
                                        Apply Filters
                                    </Button>
                                    <Button onClick={resetFilters} variant="outline" size="sm">
                                        <X className="w-4 h-4 mr-2" />
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Data Table */}
                {!error && data && data.items && (
                    <Card>
                        <CardContent className="pt-6">
                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : data.items.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold">No generations found</h3>
                                    <p className="text-muted-foreground mt-2">
                                        Try adjusting your filters or check back later
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>ID</TableHead>
                                                    <TableHead>Timestamp</TableHead>
                                                    <TableHead>File Name</TableHead>
                                                    <TableHead>Title</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Slides</TableHead>
                                                    <TableHead className="text-right">Size</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.items.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-mono text-sm">{item.id}</TableCell>
                                                        <TableCell className="text-sm whitespace-nowrap">
                                                            {formatDate(item.timestamp)}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {item.file_name || 'N/A'}
                                                        </TableCell>
                                                        <TableCell>{item.presentation_title || item.title || 'N/A'}</TableCell>
                                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                        <TableCell>
                                                            {item.student_type === 'group' ? (
                                                                <Badge variant="secondary">
                                                                    <Users className="w-3 h-3 mr-1" /> Group
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline">Single</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">{item.num_slides || 0}</TableCell>
                                                        <TableCell className="text-right">{formatFileSize(item.file_size)}</TableCell>
                                                        <TableCell>
                                                            <Button
                                                                onClick={() => fetchGenerationDetail(item.id)}
                                                                variant="ghost"
                                                                size="sm"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination */}
                                    <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {offset + 1} to {Math.min(offset + itemsPerPage, data.total)} of {data.total} results
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1 || loading}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                Previous
                                            </Button>
                                            <div className="text-sm font-medium px-4">
                                                Page {currentPage} of {totalPages}
                                            </div>
                                            <Button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages || loading}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Next
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Detail Dialog */}
                <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Generation Details</DialogTitle>
                            <DialogDescription>
                                Complete information about this presentation generation
                            </DialogDescription>
                        </DialogHeader>
                        {selectedGeneration && (
                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">ID</Label>
                                        <p className="font-mono">{selectedGeneration.id}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Status</Label>
                                        <div className="mt-1">{getStatusBadge(selectedGeneration.status)}</div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Timestamp</Label>
                                        <p>{formatDate(selectedGeneration.timestamp)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Generation Time</Label>
                                        <p>{selectedGeneration.generation_time?.toFixed(2) || 'N/A'} seconds</p>
                                    </div>
                                </div>

                                {/* File Info */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">File Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">File Name</Label>
                                            <p>{selectedGeneration.file_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">File Size</Label>
                                            <p>{formatFileSize(selectedGeneration.file_size)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Number of Slides</Label>
                                            <p>{selectedGeneration.num_slides || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Presentation Info */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Presentation Information</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">Title</Label>
                                            <p>{selectedGeneration.presentation_title || selectedGeneration.title || 'N/A'}</p>
                                        </div>
                                        {selectedGeneration.subtitle && (
                                            <div>
                                                <Label className="text-muted-foreground">Subtitle</Label>
                                                <p>{selectedGeneration.subtitle}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* College Info */}
                                {selectedGeneration.college_name && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-3">College Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-muted-foreground">College</Label>
                                                <p>{selectedGeneration.college_name}</p>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Course</Label>
                                                <p>{selectedGeneration.course || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Semester</Label>
                                                <p>{selectedGeneration.semester || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Professor</Label>
                                                <p>{selectedGeneration.professor_name || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Students */}
                                {selectedGeneration.students && selectedGeneration.students.length > 0 && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-3">
                                            Student{selectedGeneration.students.length > 1 ? 's' : ''} ({selectedGeneration.student_type})
                                        </h3>
                                        <div className="space-y-2">
                                            {selectedGeneration.students.map((student, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-2 bg-accent/50 rounded">
                                                    <span>{student.name}</span>
                                                    {student.usn && <span className="font-mono text-sm">{student.usn}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Content Features */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Content Features</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedGeneration.has_tables && <Badge>Has Tables</Badge>}
                                        {selectedGeneration.has_images && <Badge>Has Images</Badge>}
                                        {selectedGeneration.has_charts && <Badge>Has Charts</Badge>}
                                        {!selectedGeneration.has_tables && !selectedGeneration.has_images && !selectedGeneration.has_charts && (
                                            <Badge variant="outline">No special features</Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Technical Info */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Technical Information</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">IP Address</Label>
                                            <p className="font-mono text-sm">{selectedGeneration.ip_address || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">User Agent</Label>
                                            <p className="text-sm break-all">{selectedGeneration.user_agent || 'N/A'}</p>
                                        </div>
                                        {selectedGeneration.error_message && (
                                            <div>
                                                <Label className="text-destructive">Error Message</Label>
                                                <p className="text-sm text-destructive">{selectedGeneration.error_message}</p>
                                            </div>
                                        )}
                                        {selectedGeneration.content_summary && (
                                            <div>
                                                <Label className="text-muted-foreground">Content Summary</Label>
                                                <p className="text-sm">{selectedGeneration.content_summary}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </PageTransition>
    );
}
