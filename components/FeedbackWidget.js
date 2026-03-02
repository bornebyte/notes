'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function FeedbackWidget({ variant = 'floating' }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        feedback_text: '',
        rating: null,
        category: 'other'
    });
    const [hoveredRating, setHoveredRating] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.feedback_text.trim()) {
            toast({
                title: "Error",
                description: "Please provide your feedback",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    feedback_text: formData.feedback_text.trim(),
                    rating: formData.rating,
                    category: formData.category
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitted(true);
                toast({
                    title: "Success",
                    description: data.message || "Thank you for your feedback!"
                });

                // Reset form after 2 seconds
                setTimeout(() => {
                    setFormData({
                        feedback_text: '',
                        rating: null,
                        category: 'other'
                    });
                    setSubmitted(false);
                    setOpen(false);
                }, 2000);
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to submit feedback",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast({
                title: "Error",
                description: "Failed to submit feedback. Please try again.",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRatingClick = (rating) => {
        setFormData({ ...formData, rating });
    };

    const TriggerButton = variant === 'floating' ? (
        <Button
            size="lg"
            className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all z-50"
            title="Send Feedback"
        >
            <MessageSquare className="w-6 h-6" />
        </Button>
    ) : (
        <Button variant="outline" size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedback
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {TriggerButton}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Send Feedback</DialogTitle>
                    <DialogDescription>
                        Help us improve by sharing your thoughts or reporting issues
                    </DialogDescription>
                </DialogHeader>

                {submitted ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <h3 className="text-xl font-bold">Thank you!</h3>
                        <p className="text-center text-muted-foreground text-sm">
                            Your feedback has been submitted successfully.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Category Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="praise">🎉 Praise</SelectItem>
                                    <SelectItem value="feature">💡 Feature Request</SelectItem>
                                    <SelectItem value="bug">🐛 Bug Report</SelectItem>
                                    <SelectItem value="improvement">📈 Improvement</SelectItem>
                                    <SelectItem value="other">💬 Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Feedback Text */}
                        <div className="space-y-2">
                            <Label htmlFor="feedback">
                                Your Feedback <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="feedback"
                                placeholder="Tell us what you think..."
                                value={formData.feedback_text}
                                onChange={(e) => setFormData({ ...formData, feedback_text: e.target.value })}
                                rows={4}
                                maxLength={5000}
                                required
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {formData.feedback_text.length}/5000
                            </p>
                        </div>

                        {/* Rating */}
                        <div className="space-y-2">
                            <Label>Rating (Optional)</Label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRatingClick(star)}
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(null)}
                                        className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                    >
                                        <Star
                                            className={`w-7 h-7 ${star <= (hoveredRating || formData.rating || 0)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-300'
                                                }`}
                                        />
                                    </button>
                                ))}
                                {formData.rating && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, rating: null })}
                                        className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={submitting || !formData.feedback_text.trim()}
                        >
                            {submitting ? (
                                <>Submitting...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Feedback
                                </>
                            )}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
