import styled, { css } from 'styled-components';
import { ButtonProps, ButtonVariant, ButtonSize } from './Button.types';
import { theme } from '@/theme';

const variantStyles = {
  primary: css`
    background-color: ${theme.colors.primary.main};
    color: ${theme.colors.primary.contrast};
    border: 2px solid ${theme.colors.primary.main};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.primary.dark};
      border-color: ${theme.colors.primary.dark};
    }
  `,
  secondary: css`
    background-color: ${theme.colors.secondary.main};
    color: ${theme.colors.secondary.contrast};
    border: 2px solid ${theme.colors.secondary.main};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.secondary.dark};
      border-color: ${theme.colors.secondary.dark};
    }
  `,
  success: css`
    background-color: ${theme.colors.success.main};
    color: ${theme.colors.success.contrast};
    border: 2px solid ${theme.colors.success.main};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.success.dark};
      border-color: ${theme.colors.success.dark};
    }
  `,
  warning: css`
    background-color: ${theme.colors.warning.main};
    color: ${theme.colors.warning.contrast};
    border: 2px solid ${theme.colors.warning.main};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.warning.dark};
      border-color: ${theme.colors.warning.dark};
    }
  `,
  danger: css`
    background-color: ${theme.colors.error.main};
    color: ${theme.colors.error.contrast};
    border: 2px solid ${theme.colors.error.main};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.error.dark};
      border-color: ${theme.colors.error.dark};
    }
  `,
  ghost: css`
    background-color: transparent;
    color: ${theme.colors.primary.main};
    border: 2px solid ${theme.colors.primary.main};
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.primary.main};
      color: ${theme.colors.primary.contrast};
    }
  `,
};

const sizeStyles = {
  small: css`
    padding: ${theme.spacing[2]} ${theme.spacing[3]};
    font-size: ${theme.typography.fontSize.sm};
  `,
  medium: css`
    padding: ${theme.spacing[3]} ${theme.spacing[4]};
    font-size: ${theme.typography.fontSize.base};
  `,
  large: css`
    padding: ${theme.spacing[4]} ${theme.spacing[6]};
    font-size: ${theme.typography.fontSize.lg};
  `,
};

export const StyledButton = styled.button<{
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  font-family: ${theme.typography.fontFamily.sans};
  font-weight: ${theme.typography.fontWeight.semibold};
  line-height: ${theme.typography.lineHeight.tight};
  border-radius: ${theme.borderRadius.lg};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  outline: none;
  
  ${({ variant }) => variantStyles[variant]}
  ${({ size }) => sizeStyles[size]}
  
  ${({ fullWidth }) => fullWidth && css`
    width: 100%;
  `}
  
  ${({ loading }) => loading && css`
    opacity: 0.7;
    cursor: not-allowed;
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:focus-visible {
    box-shadow: 0 0 0 3px ${theme.colors.primary.light}40;
  }
  
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

export const LoadingSpinner = styled.span`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;