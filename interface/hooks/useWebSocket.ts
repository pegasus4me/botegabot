import { useEffect, useState } from 'react';
import { wsClient } from '@/lib/websocket';

export function useWebSocketConnection(apiKey: string | null) {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!apiKey) return;

        wsClient.connect(apiKey);

        const handleConnection = (status: boolean) => {
            setIsConnected(status);
        };

        wsClient.subscribe('connected', handleConnection);

        return () => {
            wsClient.unsubscribe('connected', handleConnection);
        };
    }, [apiKey]);

    return isConnected;
}

export function useWebSocketEvent(event: string, callback: (data: any) => void) {
    useEffect(() => {
        wsClient.subscribe(event, callback);
        return () => {
            wsClient.unsubscribe(event, callback);
        };
    }, [event, callback]);
}
