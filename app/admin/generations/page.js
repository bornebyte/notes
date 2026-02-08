import GenerationsClient from "./GenerationsClient";
import { getGenerations, checkAPIHealth } from "@/lib/api/generations";

export const dynamic = 'force-dynamic';

export default async function GenerationsPage() {
    let data = null;
    let error = null;
    let apiStatus = 'unknown';

    try {
        // First check if API is reachable
        try {
            const health = await checkAPIHealth();
            apiStatus = health.status === 'healthy' ? 'healthy' : 'unhealthy';
        } catch (healthError) {
            apiStatus = 'unreachable';
            console.error('API health check failed:', healthError.message);
        }

        // If API is reachable, try to fetch initial data
        if (apiStatus === 'healthy') {
            data = await getGenerations({ limit: 50, offset: 0 });
        } else {
            throw new Error('PPT API server is unreachable. Please check the configuration.');
        }
    } catch (err) {
        console.error('Error loading generations:', err);

        // Provide user-friendly error messages
        if (err.message.includes('ENOTFOUND') || err.message.includes('fetch failed')) {
            error = 'Unable to connect to PPT API server. Please verify the API URL is configured correctly.';
        } else if (err.message.includes('ECONNREFUSED')) {
            error = 'PPT API server is not running or refusing connections.';
        } else if (err.message.includes('timeout')) {
            error = 'Connection timeout. The PPT API server is taking too long to respond.';
        } else if (err.message.includes('Unauthorized')) {
            error = 'Authentication failed. Please check the API key configuration.';
        } else {
            error = err.message || 'Failed to load generation data. Please try again later.';
        }

        // Provide empty defaults
        data = {
            total: 0,
            limit: 50,
            offset: 0,
            items: []
        };
    }

    return (
        <GenerationsClient
            initialData={data}
            initialError={error}
            apiStatus={apiStatus}
        />
    );
}
