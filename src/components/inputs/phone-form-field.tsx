"use client";

import type { CountryCode } from "libphonenumber-js";
import type { InputHTMLAttributes } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import * as React from "react";
import * as Flags from "country-flag-icons/react/3x2";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
} from "libphonenumber-js";
import { CheckIcon, ChevronsUpDown } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";

// ---------------------------------------------------------------------------
// Country list (built once at module level — stable across renders)
// ---------------------------------------------------------------------------

const displayNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

type CountryEntry = { value: CountryCode; label: string };

const COUNTRY_LIST: CountryEntry[] = getCountries()
  .map((code) => ({
    value: code,
    label: displayNames?.of(code) ?? code,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a full dial-digit string (callingCode + nationalDigits, no leading +)
 * into the international display format using AsYouType.
 * Returns "" when there are no national digits.
 */
function formatDisplay(dialDigits: string, callingCode: string): string {
  const nationalDigits = dialDigits.slice(callingCode.length);
  if (!nationalDigits) return "";
  return new AsYouType().input(`+${dialDigits}`);
}

/**
 * Derive E.164 from dial-digit string. Falls back to "+dialDigits" for
 * incomplete numbers that parsePhoneNumber cannot validate.
 */
function dialDigitsToE164(dialDigits: string, callingCode: string): string {
  const nationalDigits = dialDigits.slice(callingCode.length);
  if (!nationalDigits) return "";
  try {
    return parsePhoneNumber(`+${dialDigits}`).format("E.164");
  } catch {
    return `+${dialDigits}`;
  }
}

/**
 * Parse an E.164 value and return the display string (international format)
 * and the detected country. Used for external value sync only.
 */
function fromE164(
  e164: string,
  fallbackCountry: CountryCode,
): { country: CountryCode; display: string } {
  try {
    const parsed = parsePhoneNumber(e164);
    // Use AsYouType for display so the format matches what the user sees while typing
    const display = new AsYouType().input(e164);
    return { country: parsed.country ?? fallbackCountry, display };
  } catch {
    // Incomplete E.164 — still format what we can
    const display = e164 ? new AsYouType().input(e164) : "";
    return { country: fallbackCountry, display };
  }
}

/**
 * Given raw input from the text field and the currently selected country,
 * return the normalised dial-digit string (callingCode + nationalDigits).
 * Strips a duplicated country code if the user accidentally typed it twice.
 */
function normaliseDialDigits(rawInput: string, callingCode: string): string {
  const digits = rawInput.replace(/\D/g, "");

  let dialDigits: string;

  if (digits.startsWith(callingCode)) {
    // The digits already include the calling code. Deduplicate if it was
    // accidentally entered twice (e.g. "+1+1 202..." → "112..." → "12...").
    const doubleCode = callingCode + callingCode;
    dialDigits = digits.startsWith(doubleCode)
      ? digits.slice(callingCode.length)
      : digits;
  } else {
    // The user typed only the national portion — prepend the calling code.
    dialDigits = callingCode + digits;
  }

  return dialDigits;
}

// ---------------------------------------------------------------------------
// FlagComponent
// ---------------------------------------------------------------------------

const FlagComponent = ({
  country,
  countryName,
}: {
  country: CountryCode;
  countryName: string;
}) => {
  const Flag = (
    Flags as Record<string, React.ComponentType<{ title: string }>>
  )[country];
  return (
    <span className="bg-foreground/20 flex h-4 w-6 overflow-hidden rounded-sm [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

// ---------------------------------------------------------------------------
// CountrySelectOption
// ---------------------------------------------------------------------------

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: {
  country: CountryCode;
  countryName: string;
  selectedCountry: CountryCode;
  onChange: (country: CountryCode) => void;
  onSelectComplete: () => void;
}) => {
  const handleSelect = () => {
    onChange(country);
    onSelectComplete();
  };

  return (
    <CommandItem className="gap-2" onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-foreground/50 text-sm">{`+${getCountryCallingCode(country)}`}</span>
      <CheckIcon
        className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
      />
    </CommandItem>
  );
};

// ---------------------------------------------------------------------------
// CountrySelect
// ---------------------------------------------------------------------------

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  onChange,
}: {
  disabled?: boolean;
  value: CountryCode;
  onChange: (country: CountryCode) => void;
}) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedLabel =
    COUNTRY_LIST.find((c) => c.value === selectedCountry)?.label ??
    selectedCountry;

  return (
    <Popover
      open={isOpen}
      modal
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex gap-1 rounded-s-lg rounded-e-none border-r-0 px-3 focus:z-10"
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedLabel}
          />
          <ChevronsUpDown
            className={cn(
              "-mr-2 size-4 opacity-50",
              disabled ? "hidden" : "opacity-100",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewport = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );
                  if (viewport) viewport.scrollTop = 0;
                }
              }, 0);
            }}
            placeholder="Search country..."
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRY_LIST.map(({ value, label }) => (
                  <CountrySelectOption
                    key={value}
                    country={value}
                    countryName={label}
                    selectedCountry={selectedCountry}
                    onChange={onChange}
                    onSelectComplete={() => setIsOpen(false)}
                  />
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ---------------------------------------------------------------------------
// PhoneInput — combined country selector + formatted text input
// ---------------------------------------------------------------------------

type PhoneInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  defaultCountry?: CountryCode;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  id?: string;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      disabled,
      placeholder,
      defaultCountry = "US",
      className,
      onKeyDown,
      onFocus,
      onBlur,
      id,
      required,
      autoFocus,
      autoComplete,
      inputRef,
    },
    ref,
  ) => {
    const [country, setCountry] = React.useState<CountryCode>(defaultCountry);
    const [displayValue, setDisplayValue] = React.useState<string>(() => {
      if (value?.startsWith("+")) {
        return fromE164(value, defaultCountry).display;
      }
      return "";
    });

    // Track the last E.164 string we emitted via onChange so the external-sync
    // useEffect below can distinguish "value changed because we typed" from
    // "value changed because the parent reset/prefilled the form". Without this,
    // the effect would overwrite displayValue on every keystroke, causing the
    // input to appear to lag or lose characters.
    const lastEmittedE164 = React.useRef<string>(value ?? "");

    // Sync from external value changes (form.reset(), programmatic setValue, etc.)
    const prevValue = React.useRef<string | undefined>(value);
    React.useEffect(() => {
      if (value === prevValue.current) return;
      prevValue.current = value;

      // Skip if this is the echo of our own onChange call
      if (value === lastEmittedE164.current) return;

      if (!value) {
        setDisplayValue("");
        setCountry(defaultCountry);
        return;
      }
      if (value.startsWith("+")) {
        const { country: parsedCountry, display } = fromE164(
          value,
          defaultCountry,
        );
        setCountry(parsedCountry);
        setDisplayValue(display);
      }
    }, [value, defaultCountry]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const callingCode = getCountryCallingCode(country);
      const dialDigits = normaliseDialDigits(rawInput, callingCode);
      const nationalDigits = dialDigits.slice(callingCode.length);

      if (!nationalDigits) {
        // The user is typing the country code prefix ("+", "+1", "1", etc.) or
        // has cleared the field. Show "+<callingCode>" as visual feedback when
        // there is any input, so they don't see a blank input and think it broke.
        const hasAnyInput =
          rawInput.replace(/\D/g, "").length > 0 || rawInput.includes("+");
        const partial = hasAnyInput
          ? (new AsYouType().input(`+${callingCode}`) ?? `+${callingCode}`)
          : "";
        setDisplayValue(partial);
        lastEmittedE164.current = "";
        onChange?.("");
        return;
      }

      const display = new AsYouType().input(`+${dialDigits}`);
      setDisplayValue(display);

      const e164 = dialDigitsToE164(dialDigits, callingCode);
      lastEmittedE164.current = e164;
      onChange?.(e164);
    };

    const handleCountryChange = (newCountry: CountryCode) => {
      const oldCallingCode = getCountryCallingCode(country);
      const newCallingCode = getCountryCallingCode(newCountry);

      // Preserve the national portion when switching countries
      const allDigits = displayValue.replace(/\D/g, "");
      const nationalDigits = allDigits.startsWith(oldCallingCode)
        ? allDigits.slice(oldCallingCode.length)
        : allDigits;

      setCountry(newCountry);

      const newDialDigits = newCallingCode + nationalDigits;
      const display = formatDisplay(newDialDigits, newCallingCode);
      setDisplayValue(display);

      const e164 = dialDigitsToE164(newDialDigits, newCallingCode);
      lastEmittedE164.current = e164;
      onChange?.(e164);
    };

    return (
      <div className={cn("flex", className)}>
        <CountrySelect
          value={country}
          onChange={handleCountryChange}
          disabled={disabled}
        />
        <Input
          ref={(el) => {
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
            if (inputRef)
              (
                inputRef as React.MutableRefObject<HTMLInputElement | null>
              ).current = el;
          }}
          className={"rounded-s-none rounded-e-lg"}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          id={id}
          required={required}
          autoFocus={autoFocus}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
        />
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";

// ---------------------------------------------------------------------------
// PhoneFormField — react-hook-form wrapper (public API unchanged)
// ---------------------------------------------------------------------------

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onChangeAdditional?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  inputId?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  required?: boolean;
  autoFocus?: boolean;
  labelClassName?: string;
  inputClassName?: string;
  descriptionClassName?: string;
  autoComplete?: string;
};

export const PhoneFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  placeholder,
  onChange,
  onChangeAdditional,
  onKeyDown,
  onFocus,
  onBlur,
  inputId,
  inputRef,
  required,
  autoFocus,
  labelClassName,
  inputClassName,
  descriptionClassName,
  autoComplete,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("col-span-full", className)}>
          {label && (
            <FormLabel className={cn(labelClassName)}>
              {label} {required && <span className="text-red-500">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <PhoneInput
              disabled={disabled}
              className={inputClassName}
              placeholder={placeholder ?? ""}
              defaultCountry="US"
              value={field.value as string | undefined}
              onChange={(val) => {
                onChangeAdditional?.(val);
                if (onChange) {
                  onChange(val);
                } else {
                  field.onChange(val);
                }
              }}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              onBlur={(e) => {
                field.onBlur();
                onBlur?.(e);
              }}
              id={inputId}
              required={required}
              autoFocus={autoFocus}
              inputRef={inputRef}
              autoComplete={autoComplete}
            />
          </FormControl>
          {description && (
            <FormDescription className={cn(descriptionClassName)}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export { PhoneInput };
