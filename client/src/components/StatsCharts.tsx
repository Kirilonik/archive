import { memo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type PaletteKey = 'purple' | 'pink' | 'orange' | 'blue' | 'teal' | 'yellow';

const palette: Record<PaletteKey, string> = {
  purple: '#3b82f6', // Заменен на синий в стиле сайта
  pink: '#ec4899',
  orange: '#f97316',
  blue: '#60a5fa',
  teal: '#2dd4bf',
  yellow: '#facc15',
};

const textColor = '#f3f4f6';
const textMuted = '#9ca3af';
const gridColor = '#1f2937';

function ChartContainer({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: '#111827',
  borderColor: gridColor,
  borderRadius: 8,
  color: textColor,
};
const tooltipItemStyle = { color: textColor };

type TooltipFormatter = (value: unknown, name: string) => [React.ReactNode, string];

const countTooltipFormatter: TooltipFormatter = (value) => [String(value ?? ''), 'Количество'];
const avgRatingTooltipFormatter: TooltipFormatter = (value) => {
  if (typeof value === 'number') {
    return [Number(value.toFixed(1)), 'Средняя оценка'];
  }
  return [String(value ?? ''), 'Средняя оценка'];
};

interface GenresChartProps {
  data: { genre: string; count: number }[];
}

export const GenresChart = memo(({ data }: GenresChartProps) => {
  if (!data || data.length === 0) {
    return <ChartEmptyFallback title="Распределение по жанрам" />;
  }
  const colors = [palette.purple, palette.orange, palette.pink, palette.blue, palette.teal, palette.yellow];
  return (
    <ChartContainer title="Распределение по жанрам">
      <BarChart data={data} margin={{ left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="genre" stroke={textMuted} tick={{ fill: textMuted, fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis stroke={textMuted} tick={{ fill: textMuted }} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={countTooltipFormatter}
          labelFormatter={(label) => `Жанр: ${label}`}
        />
        <Bar dataKey="count" radius={6}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
});

interface YearsChartProps {
  data: { year: number; count: number }[];
}

export const YearsChart = memo(({ data }: YearsChartProps) => {
  if (!data || data.length === 0) return <ChartEmptyFallback title="Распределение по годам" />;
  const chartData = data.map((d) => ({ ...d, label: String(d.year) }));
  return (
    <ChartContainer title="Распределение по годам">
      <LineChart data={chartData} margin={{ left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke={textMuted} tick={{ fill: textMuted }} interval="preserveStartEnd" />
        <YAxis stroke={textMuted} tick={{ fill: textMuted }} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={countTooltipFormatter}
          labelFormatter={(label) => `Год: ${label}`}
        />
        <Line type="monotone" dataKey="count" stroke={palette.purple} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
});

interface RatingsChartProps {
  data: { range: string; count: number }[];
}

export const RatingsChart = memo(({ data }: RatingsChartProps) => {
  if (!data || data.length === 0) return <ChartEmptyFallback title="Распределение оценок" />;
  const colors = [palette.purple, palette.orange, palette.pink, palette.blue, palette.teal];
  return (
    <ChartContainer title="Распределение оценок">
      <BarChart data={data} margin={{ left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="range" stroke={textMuted} tick={{ fill: textMuted }} />
        <YAxis stroke={textMuted} tick={{ fill: textMuted }} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={countTooltipFormatter}
          labelFormatter={(label) => `Диапазон: ${label}`}
        />
        <Bar dataKey="count" radius={6}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
});

interface FilmsVsSeriesChartProps {
  films: number;
  series: number;
}

export const FilmsVsSeriesChart = memo(({ films, series }: FilmsVsSeriesChartProps) => {
  if (films === 0 && series === 0) return <ChartEmptyFallback title="Соотношение фильмов и сериалов" />;
  const data = [
    { name: 'Фильмы', value: films, color: palette.purple },
    { name: 'Сериалы', value: series, color: palette.pink },
  ];
  return (
    <ChartContainer title="Соотношение фильмов и сериалов">
      <PieChart>
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={countTooltipFormatter}
          labelFormatter={(label) => `Тип: ${label}`}
        />
        <Legend formatter={(value) => <span style={{ color: textColor }}>{value}</span>} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
});

interface MonthlyChartProps {
  data: { month: string | null; count: number }[];
}

export const MonthlyChart = memo(({ data }: MonthlyChartProps) => {
  if (!data || data.length === 0) return <ChartEmptyFallback title="Динамика добавления" />;
  const chartData = data.map((d) => ({ ...d, month: d.month ?? 'Не указано' }));
  return (
    <ChartContainer title="Динамика добавления">
      <LineChart data={chartData} margin={{ left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="month" stroke={textMuted} tick={{ fill: textMuted }} interval="preserveStart" />
        <YAxis stroke={textMuted} tick={{ fill: textMuted }} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={countTooltipFormatter}
          labelFormatter={(label) => `Месяц: ${label}`}
        />
        <Line type="monotone" dataKey="count" stroke={palette.orange} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
});

interface AvgRatingByGenreChartProps {
  data: { genre: string; avgRating: number; count: number }[];
}

export const AvgRatingByGenreChart = memo(({ data }: AvgRatingByGenreChartProps) => {
  if (!data || data.length === 0) return <ChartEmptyFallback title="Средняя оценка по жанрам" />;
  return (
    <ChartContainer title="Средняя оценка по жанрам">
      <BarChart data={data} margin={{ left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="genre" stroke={textMuted} tick={{ fill: textMuted }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis stroke={textMuted} tick={{ fill: textMuted }} domain={[0, 10]} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={avgRatingTooltipFormatter}
          labelFormatter={(label) => `Жанр: ${label}`}
        />
        <Bar dataKey="avgRating" fill={palette.teal} radius={6} />
      </BarChart>
    </ChartContainer>
  );
});

interface StatusesChartProps {
  data: { status: string; count: number }[];
}

export const StatusesChart = memo(({ data }: StatusesChartProps) => {
  if (!data || data.length === 0) return <ChartEmptyFallback title="Статусы просмотра" />;
  const colors = [palette.purple, palette.orange, palette.blue, palette.teal, palette.yellow];
  return (
    <ChartContainer title="Статусы просмотра">
      <PieChart>
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={countTooltipFormatter}
          labelFormatter={(label) => `Статус: ${label}`}
        />
        <Legend formatter={(value) => <span style={{ color: textColor }}>{value}</span>} />
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} paddingAngle={3}>
          {data.map((entry, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
});

interface DirectorsChartProps {
  data: { director: string; count: number }[];
}

export const DirectorsChart = memo(({ data }: DirectorsChartProps) => {
  if (!data || data.length === 0) return <ChartEmptyFallback title="Топ режиссеров" />;
  return (
    <ChartContainer title="Топ режиссеров">
      <BarChart data={data} margin={{ left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="director" stroke={textMuted} tick={{ fill: textMuted }} interval={0} angle={-25} textAnchor="end" height={70} />
        <YAxis stroke={textMuted} tick={{ fill: textMuted }} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: textMuted }}
          itemStyle={tooltipItemStyle}
          formatter={countTooltipFormatter}
          labelFormatter={(label) => `Режиссер: ${label}`}
        />
        <Bar dataKey="count" fill={palette.blue} radius={6} />
      </BarChart>
    </ChartContainer>
  );
});

GenresChart.displayName = 'GenresChart';
YearsChart.displayName = 'YearsChart';
RatingsChart.displayName = 'RatingsChart';
FilmsVsSeriesChart.displayName = 'FilmsVsSeriesChart';
MonthlyChart.displayName = 'MonthlyChart';
AvgRatingByGenreChart.displayName = 'AvgRatingByGenreChart';
StatusesChart.displayName = 'StatusesChart';
DirectorsChart.displayName = 'DirectorsChart';

function ChartEmptyFallback({ title }: { title: string }) {
  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold text-text mb-4">{title}</h3>
      <div className="text-textMuted text-center py-8">Нет данных</div>
    </div>
  );
}

