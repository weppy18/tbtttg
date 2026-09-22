import { useId } from 'react';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  /** Optional longer description, shown as a tooltip/title. */
  hint?: string;
}

interface Props<V extends string> {
  label: string;
  value: V;
  options: readonly SegmentedOption<V>[];
  onChange: (value: V) => void;
  name?: string;
}

/** A radio group styled as a segmented control. Real radios keep it fully accessible. */
export function Segmented<V extends string>({ label, value, options, onChange, name }: Props<V>) {
  const id = useId();
  const groupName = name ?? id;
  return (
    <fieldset className="segmented">
      <legend className="segmented__label">{label}</legend>
      <div className="segmented__options">
        {options.map((o) => (
          <label key={o.value} className="segmented__option" title={o.hint}>
            <input
              type="radio"
              name={groupName}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
