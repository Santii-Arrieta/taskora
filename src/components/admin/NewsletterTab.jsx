import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Newspaper, Download } from 'lucide-react';

const NewsletterTab = ({ subscribers }) => {
    const downloadCSV = () => {
        const headers = ["email", "subscribed_at"];
        const rows = subscribers.map(sub => [sub.email, new Date(sub.subscribed_at).toLocaleString()]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "newsletter_subscribers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center"><Newspaper className="w-5 h-5 mr-2" />Suscriptores del Newsletter</CardTitle>
                    <Button onClick={downloadCSV} disabled={subscribers.length === 0}><Download className="w-4 h-4 mr-2"/>Exportar CSV</Button>
                </div>
                <CardDescription>Lista de todos los usuarios suscritos al boletín de noticias.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {subscribers.length > 0 ? subscribers.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                                <p className="font-medium">{sub.email}</p>
                                <p className="text-sm text-muted-foreground">Suscrito el: {new Date(sub.subscribed_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-muted-foreground py-8">No hay suscriptores.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default NewsletterTab;