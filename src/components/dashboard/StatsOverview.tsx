'use client';

interface StatsOverviewProps {
  stats: {
    rating: number;
    reviewCount: number;
    pendingAppointments: number;
    isVerified: boolean;
    profileViews: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    {
      label: 'Rating',
      value: stats.rating.toFixed(1),
      sub: `${stats.reviewCount} reseñas`,
      icon: '⭐',
      color: 'bg-yellow-50 text-yellow-700',
    },
    {
      label: 'Citas pendientes',
      value: stats.pendingAppointments.toString(),
      sub: 'Por confirmar',
      icon: '📅',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Estado',
      value: stats.isVerified ? 'Verificado' : 'Sin verificar',
      sub: stats.isVerified ? 'Perfil activo' : 'Pendiente de revisión',
      icon: stats.isVerified ? '✅' : '⏳',
      color: stats.isVerified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Vistas del perfil',
      value: stats.profileViews > 0 ? stats.profileViews.toString() : '—',
      sub: 'Este mes',
      icon: '👁️',
      color: 'bg-purple-50 text-purple-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-border p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {card.label}
            </span>
            <span className="text-lg">{card.icon}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
