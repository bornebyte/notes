"use client"
import { Input } from "@/components/ui/input"
import { useRef, useState, useEffect } from "react";
import ShowNotes from "./showNotes";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, SlidersHorizontal, Calendar, Star, Share, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SearchComponent = ({ notes, onRefresh }) => {
    const [searchResults, setSearchResults] = useState(notes);
    const [showFilters, setShowFilters] = useState(false);
    const inputRef = useRef(null);

    // Filter states
    const [sortBy, setSortBy] = useState('date-desc');
    const [filterByDate, setFilterByDate] = useState('all');
    const [filterByFav, setFilterByFav] = useState('all');
    const [filterByShared, setFilterByShared] = useState('all');
    const [filterByLength, setFilterByLength] = useState('all');
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    useEffect(() => {
        applyFilters(notes);
    }, [notes]);

    useEffect(() => {
        // Count active filters
        let count = 0;
        if (sortBy !== 'date-desc') count++;
        if (filterByDate !== 'all') count++;
        if (filterByFav !== 'all') count++;
        if (filterByShared !== 'all') count++;
        if (filterByLength !== 'all') count++;
        setActiveFiltersCount(count);
    }, [sortBy, filterByDate, filterByFav, filterByShared, filterByLength]);

    // Apply filters whenever any filter state changes
    useEffect(() => {
        applyFilters(notes);
    }, [sortBy, filterByDate, filterByFav, filterByShared, filterByLength]);

    const applyFilters = (notesToFilter) => {
        let filtered = [...notesToFilter];
        const query = inputRef.current?.value;

        // Apply search query
        if (query) {
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(query.toLowerCase()) ||
                note.body.toLowerCase().includes(query.toLowerCase())
            );
        }

        // Filter by date
        if (filterByDate !== 'all') {
            const now = new Date();
            filtered = filtered.filter(note => {
                const noteDate = new Date(note.created_at);
                const daysDiff = (now - noteDate) / (1000 * 60 * 60 * 24);

                switch (filterByDate) {
                    case 'today': return daysDiff < 1;
                    case 'yesterday': return daysDiff >= 1 && daysDiff < 2;
                    case 'week': return daysDiff <= 7;
                    case 'month': return daysDiff <= 30;
                    case 'quarter': return daysDiff <= 90;
                    case 'year': return daysDiff <= 365;
                    case 'older': return daysDiff > 365;
                    default: return true;
                }
            });
        }

        // Filter by favorite
        if (filterByFav !== 'all') {
            filtered = filtered.filter(note =>
                filterByFav === 'favorites' ? note.fav : !note.fav
            );
        }

        // Filter by shared
        if (filterByShared !== 'all') {
            filtered = filtered.filter(note =>
                filterByShared === 'shared' ? note.shareid : !note.shareid
            );
        }

        // Filter by content length
        if (filterByLength !== 'all') {
            filtered = filtered.filter(note => {
                const length = note.body.length;
                switch (filterByLength) {
                    case 'short': return length < 100;
                    case 'medium': return length >= 100 && length < 500;
                    case 'long': return length >= 500 && length < 2000;
                    case 'verylong': return length >= 2000;
                    default: return true;
                }
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date-asc':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'length-asc':
                    return a.body.length - b.body.length;
                case 'length-desc':
                    return b.body.length - a.body.length;
                default:
                    return 0;
            }
        });

        setSearchResults(filtered);
    };

    const searchNotes = async () => {
        const query = inputRef.current.value;
        if (!query) {
            applyFilters(notes);
            return;
        }
        try {
            const response = await fetch(`/api/notes?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
            const res = await response.json();
            applyFilters(res);
        } catch (error) {
            console.error('Error searching notes:', error);
            applyFilters(notes);
        }
    }

    const resetFilters = () => {
        setSortBy('date-desc');
        setFilterByDate('all');
        setFilterByFav('all');
        setFilterByShared('all');
        setFilterByLength('all');
        if (inputRef.current) {
            inputRef.current.value = '';
        }
        setSearchResults(notes);
    };

    return (
        <div>
            <div className="w-full space-y-4">
                {/* Search Bar */}
                <div className="w-full flex items-center justify-center gap-2">
                    <Input
                        type="text"
                        onChange={searchNotes}
                        ref={inputRef}
                        placeholder="Search notes by title or content..."
                        className="w-full md:w-2/3"
                    />
                    <Button
                        variant={showFilters ? "default" : "outline"}
                        size="icon"
                        onClick={() => setShowFilters(!showFilters)}
                        className="relative"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        {activeFiltersCount > 0 && (
                            <Badge
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                            >
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </Button>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && (
                    <Card className="w-full md:w-2/3 mx-auto">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Filter className="h-5 w-5" />
                                        Advanced Filters
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetFilters}
                                        disabled={activeFiltersCount === 0}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Clear All
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Sort By */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Sort By
                                        </label>
                                        <Select value={sortBy} onValueChange={(value) => { setSortBy(value); applyFilters(notes); }}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="date-desc">Newest First</SelectItem>
                                                <SelectItem value="date-asc">Oldest First</SelectItem>
                                                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                                                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                                                <SelectItem value="length-desc">Longest First</SelectItem>
                                                <SelectItem value="length-asc">Shortest First</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Filter by Date */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Created Date
                                        </label>
                                        <Select value={filterByDate} onValueChange={(value) => { setFilterByDate(value); applyFilters(notes); }}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Time</SelectItem>
                                                <SelectItem value="today">Today</SelectItem>
                                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                                <SelectItem value="week">Last 7 Days</SelectItem>
                                                <SelectItem value="month">Last 30 Days</SelectItem>
                                                <SelectItem value="quarter">Last 3 Months</SelectItem>
                                                <SelectItem value="year">Last Year</SelectItem>
                                                <SelectItem value="older">Older than 1 Year</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Filter by Favorite */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Star className="h-4 w-4" />
                                            Favorites
                                        </label>
                                        <Select value={filterByFav} onValueChange={(value) => { setFilterByFav(value); applyFilters(notes); }}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Notes</SelectItem>
                                                <SelectItem value="favorites">Favorites Only</SelectItem>
                                                <SelectItem value="non-favorites">Non-Favorites</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Filter by Shared */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Share className="h-4 w-4" />
                                            Sharing Status
                                        </label>
                                        <Select value={filterByShared} onValueChange={(value) => { setFilterByShared(value); applyFilters(notes); }}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Notes</SelectItem>
                                                <SelectItem value="shared">Shared Only</SelectItem>
                                                <SelectItem value="private">Private Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Filter by Length */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            Content Length
                                        </label>
                                        <Select value={filterByLength} onValueChange={(value) => { setFilterByLength(value); applyFilters(notes); }}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Lengths</SelectItem>
                                                <SelectItem value="short">Short (&lt; 100 chars)</SelectItem>
                                                <SelectItem value="medium">Medium (100-500 chars)</SelectItem>
                                                <SelectItem value="long">Long (500-2000 chars)</SelectItem>
                                                <SelectItem value="verylong">Very Long (&gt; 2000 chars)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Results Summary */}
                                <div className="pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Showing <span className="font-semibold text-foreground">{searchResults.length}</span> of <span className="font-semibold text-foreground">{notes.length}</span> notes
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="mx-auto py-6 w-full md:w-2/3">
                {searchResults.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No notes found matching your filters.</p>
                        <Button variant="link" onClick={resetFilters} className="mt-2">
                            Clear filters
                        </Button>
                    </div>
                ) : (
                    <ShowNotes notes={searchResults} onRefresh={onRefresh} noteid={null} />
                )}
            </div>
        </div>
    )
}

export default SearchComponent
