import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { CartonDto } from '@bingo/common'; // Assuming we have types for Carton

export function useRealtimeCartones() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuth((state) => state.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    // Conectar al socket
    const socket = io('/', {
      auth: { token: `Bearer ${token}` },
    });
    
    socketRef.current = socket;

    // Escuchar eventos globales y mutar el caché local
    socket.on('carton:reservado', ({ cartonId }: { cartonId: number }) => {
      // Invalidar o actualizar caché de react-query
      queryClient.setQueryData(['cartones'], (oldData: CartonDto[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(c => c.id === cartonId ? { ...c, estado: 'reservado' } : c);
      });
      // Invalidar el query específico del cartón si el usuario está viéndolo
      queryClient.invalidateQueries({ queryKey: ['carton', cartonId] });
    });

    socket.on('carton:vendido', ({ cartonId }: { cartonId: number }) => {
      queryClient.setQueryData(['cartones'], (oldData: CartonDto[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(c => c.id === cartonId ? { ...c, estado: 'vendido' } : c);
      });
      queryClient.invalidateQueries({ queryKey: ['carton', cartonId] });
    });

    socket.on('carton:liberado', ({ cartonId }: { cartonId: number }) => {
      queryClient.setQueryData(['cartones'], (oldData: CartonDto[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(c => c.id === cartonId ? { ...c, estado: 'disponible', lockedBy: null } : c);
      });
      queryClient.invalidateQueries({ queryKey: ['carton', cartonId] });
    });

    socket.on('carton:bloqueado_temporal', ({ cartonId, lockedBy }: { cartonId: number, lockedBy: string }) => {
      queryClient.setQueryData(['cartones'], (oldData: CartonDto[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(c => c.id === cartonId ? { ...c, lockedBy } : c);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  const emitTap = (cartonId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('carton:tap', { cartonId });
    }
  };

  return { emitTap };
}
