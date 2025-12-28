'use client';

import { useState, useEffect } from 'react';
import { AddNote } from "./addNote";
import { ShowTrashedNotes } from "./ShowTrashedNotes";
import { ShowFavNotes } from "./ShowFav";
import SearchComponent from "./InputPage";
import Download from "./Download";
import { RefreshButton } from "@/components/RefreshButton";
import { PageTransition, SlideIn } from "@/components/PageTransition";
import { setCache, getCache } from "@/lib/cache";
import { Badge } from "@/components/ui/badge";

export default function NotesClient({ initialNotes, initialFavNotes, initialTrashedNotes }) {
    const [notes, setNotes] = useState(initialNotes);
    const [favNotes, setFavNotes] = useState(initialFavNotes);
    const [trashedNotes, setTrashedNotes] = useState(initialTrashedNotes);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Calculate statistics
    const totalNotes = notes.length;
    const sharedNotes = notes.filter(note => note.shareid).length;
    const recentNotes = notes.filter(note => {
        const noteDate = new Date(note.created_at);
        const daysDiff = (new Date() - noteDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
    }).length;

    // Cache initial data on mount
    useEffect(() => {
        setCache('notes', initialNotes, 30);
        setCache('favNotes', initialFavNotes, 30);
        setCache('trashedNotes', initialTrashedNotes, 30);
    }, [initialNotes, initialFavNotes, initialTrashedNotes]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const [notesRes, favNotesRes, trashedNotesRes] = await Promise.all([
                fetch('/api/notes', { cache: 'no-store' }),
                fetch('/api/notes?type=favorites', { cache: 'no-store' }),
                fetch('/api/notes?type=trashed', { cache: 'no-store' })
            ]);

            const [freshNotes, freshFavNotes, freshTrashedNotes] = await Promise.all([
                notesRes.json(),
                favNotesRes.json(),
                trashedNotesRes.json()
            ]);

            // Update state
            setNotes(freshNotes);
            setFavNotes(freshFavNotes);
            setTrashedNotes(freshTrashedNotes);

            // Update cache
            setCache('notes', freshNotes, 30);
            setCache('favNotes', freshFavNotes, 30);
            setCache('trashedNotes', freshTrashedNotes, 30);
        } catch (error) {
            console.error('Error refreshing notes:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <PageTransition>
            <div className="space-y-6 p-4">
                <SlideIn direction="down">
                    <div className="w-full flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">Notes</h1>
                            <Badge variant="secondary">{totalNotes}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShowTrashedNotes notes={trashedNotes} onRefresh={handleRefresh} />
                            <ShowFavNotes notes={favNotes} onRefresh={handleRefresh} />
                            <AddNote icon={""} onRefresh={handleRefresh} />
                            <Download notes={notes} />
                            <RefreshButton onRefresh={handleRefresh} />
                        </div>
                    </div>
                </SlideIn>
                <SlideIn delay={0.1}>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant="outline">Total: {totalNotes}</Badge>
                        <Badge variant="outline">Favorites: {favNotes.length}</Badge>
                        <Badge variant="outline">Shared: {sharedNotes}</Badge>
                        <Badge variant="outline">Recent (7d): {recentNotes}</Badge>
                        <Badge variant="outline">Trashed: {trashedNotes.length}</Badge>
                    </div>
                </SlideIn>
                <SlideIn delay={0.2}>
                    <SearchComponent notes={notes} onRefresh={handleRefresh} key={notes.length} />
                </SlideIn>
            </div>
        </PageTransition>
    );
}
