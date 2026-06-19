"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import * as React from "react";
import {
  format,
  getHours,
  getMinutes,
  getSeconds,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
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

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  dateLabel?: string;
  timeLabel?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  labelClassName?: string;
  /** Default time when only date is set (HH:mm:ss). Default "00:00:00" */
  defaultTime?: string;
  /** When true, the time input can be left empty (stored as start of day). */
  timeOptional?: boolean;
  /**
   * When false, the time control is not shown. Selecting a date stores local
   * midnight (`defaultTime`); clearing the date sets the field to `undefined`.
   */
  includeTime?: boolean;
};

function parseTimeString(timeStr: string): { h: number; m: number; s: number } {
  const parts = timeStr.split(":").map(Number);
  return {
    h: parts[0] ?? 0,
    m: parts[1] ?? 0,
    s: parts[2] ?? 0,
  };
}

function toTimeString(date: Date): string {
  return format(date, "HH:mm:ss");
}

export function DateTimeFormField<CurrentForm extends FieldValues>({
  form,
  name,
  label,
  dateLabel = "Date",
  timeLabel = "Time",
  description,
  className,
  disabled,
  required,
  labelClassName,
  defaultTime = "00:00:00",
  timeOptional = false,
  includeTime = true,
}: Props<CurrentForm>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <DateTimeFormFieldInner
          field={field}
          label={label}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          description={description}
          className={className}
          disabled={disabled}
          required={required}
          labelClassName={labelClassName}
          defaultTime={defaultTime}
          timeOptional={timeOptional}
          includeTime={includeTime}
        />
      )}
    />
  );
}

function isMidnight(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false;
  return getHours(d) === 0 && getMinutes(d) === 0 && getSeconds(d) === 0;
}

type DateTimeFormFieldInnerProps = {
  field: {
    value: Date | undefined;
    onChange: (value: Date | undefined) => void;
  };
  label?: string;
  dateLabel: string;
  timeLabel: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  labelClassName?: string;
  defaultTime: string;
  timeOptional: boolean;
  includeTime: boolean;
};

function DateTimeFormFieldInner({
  field,
  label,
  dateLabel,
  timeLabel,
  description,
  className,
  disabled,
  required,
  labelClassName,
  defaultTime,
  timeOptional,
  includeTime,
}: DateTimeFormFieldInnerProps) {
  const [open, setOpen] = React.useState(false);
  const value = field.value;

  const dateOnly = value
    ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
    : undefined;
  const timeStr = !includeTime
    ? defaultTime
    : value === undefined
      ? defaultTime
      : timeOptional && isMidnight(value)
        ? ""
        : toTimeString(value);

  const updateDateTime = (newDate: Date | undefined, newTime: string) => {
    if (!newDate) {
      field.onChange(undefined);
      return;
    }
    const timeToUse = !includeTime
      ? defaultTime
      : timeOptional && newTime === ""
        ? "00:00:00"
        : newTime || defaultTime;
    const { h, m, s } = parseTimeString(timeToUse);
    const combined = setSeconds(
      setMinutes(setHours(new Date(newDate), h), m),
      s,
    );
    field.onChange(combined);
  };

  return (
    <FormItem className={cn("col-span-full", className)}>
      {label && (
        <FormLabel className={cn(labelClassName)}>
          {label}
          {required && " *"}
        </FormLabel>
      )}
      <FormControl>
        <FieldGroup
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          disabled={disabled}
          dateOnly={dateOnly}
          timeStr={timeStr}
          defaultTime={defaultTime}
          timeOptional={timeOptional}
          includeTime={includeTime}
          open={open}
          setOpen={setOpen}
          onDateChange={(date) =>
            updateDateTime(
              date ?? undefined,
              includeTime ? timeStr : defaultTime,
            )
          }
          onTimeChange={(time) =>
            updateDateTime(
              dateOnly ?? new Date(new Date().setHours(0, 0, 0, 0)),
              time,
            )
          }
        />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}

type FieldGroupProps = {
  dateLabel: string;
  timeLabel: string;
  disabled?: boolean;
  dateOnly: Date | undefined;
  timeStr: string;
  defaultTime: string;
  timeOptional: boolean;
  includeTime: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
};

function FieldGroup({
  dateLabel,
  timeLabel,
  disabled,
  dateOnly,
  timeStr,
  defaultTime,
  timeOptional,
  includeTime,
  open,
  setOpen,
  onDateChange,
  onTimeChange,
}: FieldGroupProps) {
  const dateButtonWide = !includeTime || timeOptional;
  return (
    <div className="flex flex-row flex-wrap items-end gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm leading-none font-medium">{dateLabel}</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "justify-between font-normal",
                dateButtonWide && "w-full flex-1",
                !dateButtonWide && "w-[200px]",
              )}
            >
              {dateOnly ? format(dateOnly, "PPP") : "Select date"}
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={dateOnly}
              defaultMonth={dateOnly}
              onSelect={(date) => {
                onDateChange(date ?? undefined);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {includeTime && (
        <div className="flex flex-col gap-2">
          <span className="text-sm leading-none font-medium">
            {timeLabel}
            {timeOptional && (
              <span className="text-muted-foreground ml-1 font-normal">
                (optional)
              </span>
            )}
          </span>
          <Input
            type="time"
            step="1"
            disabled={disabled}
            value={timeStr}
            onChange={(e) =>
              onTimeChange(
                timeOptional ? e.target.value : e.target.value || defaultTime,
              )
            }
            className="bg-background w-32 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      )}
    </div>
  );
}
