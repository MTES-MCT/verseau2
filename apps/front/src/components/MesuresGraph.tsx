import { useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MesureDto } from '@lib/dossier';
import { fr } from '@codegouvfr/react-dsfr';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip);

interface MesuresGraphProps {
  data: MesureDto[];
  parametreLabel: string;
}

export function MesuresGraph({ data, parametreLabel }: MesuresGraphProps) {
  const ref = useRef<ChartJS<'line'>>(null);

  if (data.length === 0) {
    return <p className={fr.cx('fr-text--sm')}>Aucune donnée à afficher.</p>;
  }

  const sorted = [...data].sort(
    (a, b) => new Date(a.prelevementDate!).getTime() - new Date(b.prelevementDate!).getTime(),
  );

  const labels = sorted.map((row) => {
    const d = row.prelevementDate;
    if (!d) {
      return '';
    }
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('fr-FR');
  });

  const values = sorted.map((row) => row.resultatAnalyseValeur);

  const chartData = {
    labels,
    datasets: [
      {
        label: parametreLabel,
        data: values,
        borderColor: '#6a6af4',
        backgroundColor: '#6a6af4',
        pointBackgroundColor: '#6a6af4',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: `Évolution de ${parametreLabel}`,
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return context.parsed.y !== null ? `${context.parsed.y}` : '-';
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date de prélèvement',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Valeur',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
      <Line ref={ref} data={chartData} options={options} />
    </div>
  );
}
