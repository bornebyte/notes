'use client';

import * as XLSX from 'xlsx';
import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

export function useDataExport() {

    const formatBodyForHtml = (text) => {
        if (!text) return '';
        let html = text;

        // Headings
        html = html.replace(/^###\s+(.*)$/gm, '<h4>$1</h4>');

        // Bold and Italic (***...***)
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        // Bold (**...**)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic (*...*)
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Underline (__...__)
        html = html.replace(/__(.*?)__/g, '<u>$1</u>');

        // Lists
        // Process lists line by line, then wrap them in <ul>
        html = html.replace(/^\*\s+(.*)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

        // Paragraphs and line breaks
        html = html.split('\n\n').map(paragraph => {
            if (paragraph.startsWith('<h4>') || paragraph.startsWith('<ul>')) return paragraph;
            return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return html;
    };

    const stripMarkdown = (text) => {
        if (!text) return '';
        return text
            .replace(/^###\s+/gm, '')
            .replace(/\*\*\*|\*\*|\*|__/g, '');
    };

    const exportData = useCallback((data, filename, format) => {
        switch (format) {
            case 'json':
                const processedJsonData = data.map(note => ({ ...note, body: stripMarkdown(note.body) }));
                const jsonBlob = new Blob([JSON.stringify(processedJsonData, null, 2)], {
                    type: 'application/json'
                });
                downloadBlob(jsonBlob, `${filename}.json`);
                break;

            case 'csv':
                const processedCsvData = data.map(note => ({ ...note, body: stripMarkdown(note.body) }));
                const worksheet = XLSX.utils.json_to_sheet(processedCsvData);
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                const csvBlob = new Blob([csv], { type: 'text/csv' });
                downloadBlob(csvBlob, `${filename}.csv`);
                break;

            case 'excel':
                const processedExcelData = data.map(note => ({ ...note, body: stripMarkdown(note.body) }));
                const ws = XLSX.utils.json_to_sheet(processedExcelData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Data');
                XLSX.writeFile(wb, `${filename}.xlsx`);
                break;
            case 'pdf':
                const doc = new jsPDF();

                doc.setFontSize(20);
                doc.text('My Notes', 14, 20);
                const formatedData = data.map(note => ({ ...note, body: stripMarkdown(note.body) }));
                const tableData = formatedData.map(note => [
                    note.created_at,
                    note.id,
                    note.title,
                    note.body.substring(0, 50) + '...',
                    note.category,
                    note.hidden,
                    note.fav,
                    note.trash,
                    note.archived,
                    note.lastupdated,
                    note.shareid
                ]);

                autoTable(doc, {
                    head: [['Created At', 'ID', 'Title', 'Body', 'Category', 'Hidden', 'Fav', 'Trash', 'Archived', 'Last Updated', 'Share ID']],
                    body: tableData,
                    startY: 30
                });

                doc.save('notes.pdf');
                break;
            case 'html':
                const html = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Notes</title>
                        <style>
                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                max-width: 800px;
                                margin: 40px auto;
                                padding: 20px;
                                background: #f5f5f5;
                                color: #333;
                            }
                            .note {
                                background: white;
                                padding: 20px;
                                margin-bottom: 20px;
                                border-radius: 8px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            }
                            h1 { 
                                color: #333; 
                            }
                            h2 { 
                                color: #555; 
                                margin-top: 0; 
                            }
                            .meta { 
                                color: #888; 
                                font-size: 14px;
                            }
                            @media (prefers-color-scheme: dark) {
                                body {
                                    background: #1a1a1a;
                                    color: #f0f0f0;
                                }
                                .note {
                                    background: #2c2c2c;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                                }
                                h1 {
                                    color: #ffffff;
                                }
                                h2, p {
                                    color: #dddddd;
                                }
                                .meta { color: #999999; }
                            }
                        </style>
                        </head>
                        <body>
                            <h1>My Notes</h1>
                            ${data.map(note => `
                                <div class="note">
                                <p class="meta">Created: ${new Date(note.created_at).toLocaleDateString()}</p>
                                <p>ID : ${note.id}</p>
                                    <h2>${note.title}</h2><div>${formatBodyForHtml(note.body)}</div>
                                    <p>Category : ${note.category}</p>
                                    <p>Hidden : ${note.hidden}</p>
                                    <p>Fav : ${note.fav}</p>
                                    <p>Trash : ${note.trash}</p>
                                    <p>Archived : ${note.archived}</p>
                                    <p>Last Updated : ${note.lastupdated}</p>
                                    <p>Share ID : ${note.shareid}</p>
                                </div>
                            `).join('')}
                        </body>
                        </html>`;

                const blob = new Blob([html], { type: 'text/html' });
                downloadBlob(blob, 'notes.html');
        }
    }, []);

    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return { exportData };
}
