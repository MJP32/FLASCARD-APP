import styled from 'styled-components';
import { theme } from '@/theme';

export const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: ${theme.spacing[4]};
`;

export const LoginCard = styled.div`
  background: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius['2xl']};
  box-shadow: ${theme.shadows.xl};
  width: 100%;
  max-width: 400px;
  padding: ${theme.spacing[8]};
`;

export const LoginHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing[8]};
`;

export const LoginTitle = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing[2]} 0;
`;

export const LoginSubtitle = styled.p`
  font-size: ${theme.typography.fontSize.base};
  color: ${theme.colors.text.secondary};
  margin: 0;
`;

export const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[4]};
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

export const Label = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

export const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  font-size: ${theme.typography.fontSize.base};
  border: 1px solid ${theme.colors.grey[300]};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background.paper};
  color: ${theme.colors.text.primary};
  transition: all ${theme.transitions.fast};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary.main};
    box-shadow: 0 0 0 3px ${theme.colors.primary.main}20;
  }
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
`;

export const ErrorMessage = styled.div`
  background: ${theme.colors.error.light}20;
  border: 1px solid ${theme.colors.error.main};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[3]};
  color: ${theme.colors.error.dark};
  font-size: ${theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

export const Divider = styled.div`
  position: relative;
  text-align: center;
  margin: ${theme.spacing[6]} 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: ${theme.colors.grey[300]};
  }
  
  span {
    position: relative;
    background: ${theme.colors.background.paper};
    padding: 0 ${theme.spacing[4]};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.fontSize.sm};
  }
`;

export const LinkButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.primary.main};
  font-size: ${theme.typography.fontSize.sm};
  cursor: pointer;
  text-decoration: underline;
  transition: color ${theme.transitions.fast};
  
  &:hover {
    color: ${theme.colors.primary.dark};
  }
  
  &:focus-visible {
    outline: 2px solid ${theme.colors.primary.main};
    outline-offset: 2px;
  }
`;