interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <input
      className="input"
      placeholder="Поиск по названию..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
