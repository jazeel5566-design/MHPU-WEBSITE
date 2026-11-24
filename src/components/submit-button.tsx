"use client";
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { buttonClass } from "./ui";

type Props = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "coral" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  pendingText?: string;
  confirm?: string;
};

export function SubmitButton({ variant, size, className, children, pendingText, confirm, onClick, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}
