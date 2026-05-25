import { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MesuresGraphItemDto } from '@lib/dossier';
import { fr } from '@codegouvfr/react-dsfr';
import { verticalLinePlugin } from './common/verticalLinePlugin';
import './common/graph.css';

const COLOR_DEFAULT = '#6a6af4' as const;
const COLOR_COMMENT = '#e4794a' as const;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, verticalLinePlugin);

interface MesuresGraphProps {
  data: MesuresGraphItemDto[];
  parametreLabel: string;
}

interface DataPoint {
  x: string | null;
  y: number | null;
  unite: string | null;
  finalite: string | null;
  evenementCommentaire?: string | null;
  typeEvenement?: string | null;
}

export function MesuresGraph({ data, parametreLabel }: MesuresGraphProps) {
  const ref = useRef<ChartJS<'line', DataPoint[]>>(null);

  if (data.length === 0) {
    return <p className={fr.cx('fr-text--sm')}>Aucune donnée à afficher.</p>;
  }

  const sorted = [...data].sort(
    (a, b) => new Date(a.prelevementDate!).getTime() - new Date(b.prelevementDate!).getTime(),
  );

  const values: DataPoint[] = sorted.map((row) => {
    const d = row.prelevementDate;
    if (!d) {
      return {
        x: null,
        y: null,
        unite: null,
        finalite: null,
        evenementCommentaire: null,
        typeEvenement: null,
      };
    }
    const date = typeof d === 'string' ? new Date(d) : d;
    return {
      x: date.toLocaleDateString('fr-FR'),
      y: row.resultatAnalyseValeur ?? null,
      unite: row.uniteMesureSymbole,
      finalite: row.analyseFinalite,
      evenementCommentaire: row.commentaire ?? null,
      typeEvenement: row.typeEvenementCode != null ? `${row.typeEvenementCode} - ${row.typeEvenementLibelle}` : null,
    };
  });

  const chartData: ChartData<'line', DataPoint[], unknown> = {
    datasets: [
      {
        label: parametreLabel,
        data: values,
        borderColor: COLOR_DEFAULT,
        backgroundColor: COLOR_DEFAULT,
        pointBackgroundColor: (ctx) =>
          ctx.dataIndex != null && values[ctx.dataIndex]?.evenementCommentaire ? COLOR_COMMENT : COLOR_DEFAULT,
        tension: 0.1,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index',
    },
    plugins: {
      title: {
        display: true,
        text: `Évolution de ${parametreLabel}`,
      },
      legend: {
        display: true,
        labels: {
          generateLabels: () => [
            {
              text: 'Sans commentaire',
              fillStyle: COLOR_DEFAULT,
              strokeStyle: COLOR_DEFAULT,
              pointStyle: 'circle',
            },
            {
              text: 'Avec commentaire',
              fillStyle: COLOR_COMMENT,
              strokeStyle: COLOR_COMMENT,
              pointStyle: 'circle',
            },
          ],
        },
      },
      tooltip: {
        animation: { duration: 100 },
        intersect: false,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const item = values[context.dataIndex];
            const lines = [`Valeur: ${context.parsed.y} : ${item.unite ?? ''}`, `Finalité : ${item.finalite ?? ''}`];
            if (item.typeEvenement) {
              lines.push(`Événement : ${item.typeEvenement}`);
            }
            if (item.evenementCommentaire) {
              lines.push(`Commentaire : ${item.evenementCommentaire}`);
            }
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: false,
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
    <div className={'chart-container'}>
      <Line ref={ref} data={chartData} options={options} />
    </div>
  );
}
