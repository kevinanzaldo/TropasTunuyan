import type { Metadata } from 'next';
import AdminTurnosClient from './AdminTurnosClient';

export const metadata: Metadata = {
  title: 'Turnos & Personal — Tropas Tunuyán',
  description: 'Gestión de empleados, control de turnos de mostrador y auditoría de arqueos de caja.',
};

export default function AdminTurnosPage() {
  return <AdminTurnosClient />;
}
