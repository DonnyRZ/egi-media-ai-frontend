"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

export function generateCredentialPassword(length = 14) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join("");
}

export function CredentialPasswordFields({
  idPrefix,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  passwordError,
  confirmError,
  helper,
}: {
  idPrefix: string;
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  passwordError?: string;
  confirmError?: string;
  helper?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  function generate() {
    const next = generateCredentialPassword();
    onPasswordChange(next);
    onConfirmChange(next);
    setCopied(false);
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="credential-password-fields">
        <label>
          <span>Password</span>
          <div className="password-field">
            <input
              id={`${idPrefix}-password`}
              aria-label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              autoComplete="new-password"
              minLength={8}
              aria-invalid={Boolean(passwordError)}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle-button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={16} strokeWidth={2} aria-hidden="true" /> : <Eye size={16} strokeWidth={2} aria-hidden="true" />}
            </button>
          </div>
          {passwordError ? <small className="access-field-error">{passwordError}</small> : null}
        </label>
        <label>
          <span>Confirm password</span>
          <div className="password-field">
            <input
              id={`${idPrefix}-confirm-password`}
              aria-label="Confirm password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              autoComplete="new-password"
              minLength={8}
              aria-invalid={Boolean(confirmError)}
              onChange={(event) => onConfirmChange(event.target.value)}
            />
          </div>
          {confirmError ? <small className="access-field-error">{confirmError}</small> : null}
        </label>
      </div>
      <div className="credential-password-actions">
        <button type="button" className="source-preview-button" onClick={generate}>
          <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
          Generate password
        </button>
        <button type="button" className="source-preview-button" onClick={() => void copyPassword()} disabled={!password}>
          <Copy size={14} strokeWidth={2} aria-hidden="true" />
          {copied ? "Copied" : "Copy"}
        </button>
        {helper ? <small>{helper}</small> : null}
      </div>
    </>
  );
}
