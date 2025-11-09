import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

const chartColors = {
  purple: 'rgba(139, 92, 246, 0.8)',
  pink: 'rgba(236, 72, 153, 0.8)',
  orange: 'rgba(251, 146, 60, 0.8)',
  purpleLight: 'rgba(168, 85, 247, 0.8)',
  pinkLight: 'rgba(244, 114, 182, 0.8)',
  orangeLight: 'rgba(252, 165, 165, 0.8)',
  border: 'rgba(255, 255, 255, 0.2)',
  text: 'rgba(255, 255, 255, 0.9)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: chartColors.text,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: chartColors.text,
      bodyColor: chartColors.text,
      borderColor: chartColors.border,
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: chartColors.textMuted },
      grid: { color: chartColors.border },
    },
    y: {
      ticks: { color: chartColors.textMuted },
      grid: { color: chartColors.border },
    },
  },
};

interface GenresChartProps {
  data: { genre: string; count: number }[];
}

export function GenresChart({ data }: GenresChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Распределение по жанрам</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.genre),
    datasets: [
      {
        label: 'Количество',
        data: data.map((d) => d.count),
        backgroundColor: [
          chartColors.purple,
          chartColors.pink,
          chartColors.orange,
          chartColors.purpleLight,
          chartColors.pinkLight,
          chartColors.orangeLight,
          chartColors.purple,
          chartColors.pink,
          chartColors.orange,
          chartColors.purpleLight,
        ],
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Распределение по жанрам</h3>
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

interface YearsChartProps {
  data: { year: number; count: number }[];
}

export function YearsChart({ data }: YearsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Распределение по годам</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => String(d.year)),
    datasets: [
      {
        label: 'Количество',
        data: data.map((d) => d.count),
        borderColor: chartColors.purple,
        backgroundColor: chartColors.purple + '40',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Распределение по годам</h3>
      <div style={{ height: '300px' }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

interface RatingsChartProps {
  data: { range: string; count: number }[];
}

export function RatingsChart({ data }: RatingsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Распределение оценок</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.range),
    datasets: [
      {
        label: 'Количество',
        data: data.map((d) => d.count),
        backgroundColor: [
          chartColors.purple,
          chartColors.pink,
          chartColors.orange,
          chartColors.purpleLight,
          chartColors.pinkLight,
        ],
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Распределение оценок</h3>
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

interface FilmsVsSeriesChartProps {
  films: number;
  series: number;
}

export function FilmsVsSeriesChart({ films, series }: FilmsVsSeriesChartProps) {
  if (films === 0 && series === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Соотношение фильмов и сериалов</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: ['Фильмы', 'Сериалы'],
    datasets: [
      {
        data: [films, series],
        backgroundColor: [chartColors.purple, chartColors.pink],
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Соотношение фильмов и сериалов</h3>
      <div style={{ height: '300px' }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

interface MonthlyChartProps {
  data: { month: string | null; count: number }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Динамика добавления</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.month || ''),
    datasets: [
      {
        label: 'Добавлено',
        data: data.map((d) => d.count),
        borderColor: chartColors.orange,
        backgroundColor: chartColors.orange + '40',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Динамика добавления</h3>
      <div style={{ height: '300px' }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

interface AvgRatingByGenreChartProps {
  data: { genre: string; avgRating: number; count: number }[];
}

export function AvgRatingByGenreChart({ data }: AvgRatingByGenreChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Средняя оценка по жанрам</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.genre),
    datasets: [
      {
        label: 'Средняя оценка',
        data: data.map((d) => d.avgRating),
        backgroundColor: chartColors.pink,
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Средняя оценка по жанрам</h3>
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, max: 10 } } }} />
      </div>
    </div>
  );
}

interface StatusesChartProps {
  data: { status: string; count: number }[];
}

export function StatusesChart({ data }: StatusesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Статусы просмотра</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.status),
    datasets: [
      {
        data: data.map((d) => d.count),
        backgroundColor: [
          chartColors.purple,
          chartColors.pink,
          chartColors.orange,
          chartColors.purpleLight,
          chartColors.pinkLight,
        ],
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Статусы просмотра</h3>
      <div style={{ height: '300px' }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

interface DirectorsChartProps {
  data: { director: string; count: number }[];
}

export function DirectorsChart({ data }: DirectorsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-text mb-4">Топ режиссеров</h3>
        <div className="text-textMuted text-center py-8">Нет данных</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.director),
    datasets: [
      {
        label: 'Количество',
        data: data.map((d) => d.count),
        backgroundColor: chartColors.orange,
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">Топ режиссеров</h3>
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

