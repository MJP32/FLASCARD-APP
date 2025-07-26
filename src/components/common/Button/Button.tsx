import React from 'react';
import { ButtonProps } from './Button.types';
import { StyledButton, LoadingSpinner } from './Button.styles';

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  className,
  leftIcon,
  rightIcon,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <StyledButton
      type={type}
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isDisabled}
      loading={loading}
      fullWidth={fullWidth}
      className={className}
      aria-label={ariaLabel}
      {...rest}
    >
      {loading && <LoadingSpinner />}
      {!loading && leftIcon && <span className="button-icon-left">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="button-icon-right">{rightIcon}</span>}
    </StyledButton>
  );
};