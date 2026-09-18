import { cn } from "~/lib/utils";

/**
 * Paper field with a hairline gold border and a rose focus ring
 * (design.md palette/craft-floor). Thin wrapper around a plain `<input>` so
 * callers keep full control of `name`/`type`/`required`/etc.
 */
export const DreamInput = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn("dream-input", className)} {...props} />
);

export const DreamTextarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn("dream-input dream-textarea", className)}
    {...props}
  />
);

export const DreamSelect = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn("dream-input dream-select", className)} {...props}>
    {children}
  </select>
);

type DreamRadioPillsOption = {
  value: string;
  label: string;
};

type DreamRadioPillsProps = {
  name: string;
  legend: string;
  options: DreamRadioPillsOption[];
  /** Uncontrolled initial value — omit `value` to use this mode. */
  defaultValue?: string;
  /** Controlled value — pairs with `onChange`. */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
  /** Forwarded to the fieldset so a group-level validation error is announced. */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Accessible fieldset of pill radios (design.md contact form: indoor/
 * outdoor, draping/throne-chair/full-decor yes-no-not-sure). Native
 * `<input type="radio">` under the hood (`sr-only`, styled via the visible
 * `<span>` sibling) so it's keyboard-operable and screen-reader labeled by
 * construction — no ARIA role reinvention needed.
 */
export function DreamRadioPills({
  name,
  legend,
  options,
  defaultValue,
  value,
  onChange,
  required,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DreamRadioPillsProps) {
  const controlled = value !== undefined;
  return (
    <fieldset
      className={cn("dream-radio-pills", className)}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    >
      <legend className="dream-radio-pills-legend">{legend}</legend>
      <div className="dream-radio-pills-row">
        {options.map((option) => (
          <label key={option.value} className="dream-radio-pill">
            <input
              type="radio"
              name={name}
              value={option.value}
              required={required}
              defaultChecked={
                controlled ? undefined : option.value === defaultValue
              }
              checked={controlled ? value === option.value : undefined}
              onChange={onChange ? () => onChange(option.value) : undefined}
              className="sr-only"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
