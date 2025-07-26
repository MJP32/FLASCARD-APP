import styled, { css, keyframes } from 'styled-components';
import { theme } from '@/theme';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const ModalBackdrop = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing[4]};
  animation: ${fadeIn} ${theme.transitions.fast};
  
  ${({ isOpen }) => !isOpen && css`
    display: none;
  `}
`;

const sizeStyles = {
  small: css`
    max-width: 400px;
  `,
  medium: css`
    max-width: 600px;
  `,
  large: css`
    max-width: 900px;
  `,
  fullscreen: css`
    max-width: calc(100vw - ${theme.spacing[8]});
    max-height: calc(100vh - ${theme.spacing[8]});
    width: 100%;
    height: 100%;
  `,
};

export const ModalContent = styled.div<{ size: string }>`
  background-color: ${theme.colors.background.paper};
  border-radius: ${theme.borderRadius.xl};
  box-shadow: ${theme.shadows.xl};
  width: 100%;
  max-height: calc(100vh - ${theme.spacing[8]});
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${slideUp} ${theme.transitions.normal};
  
  ${({ size }) => sizeStyles[size as keyof typeof sizeStyles]}
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing[6]};
  border-bottom: 1px solid ${theme.colors.grey[200]};
`;

export const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

export const ModalCloseButton = styled.button`
  background: none;
  border: none;
  padding: ${theme.spacing[2]};
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  border-radius: ${theme.borderRadius.lg};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    background-color: ${theme.colors.grey[100]};
    color: ${theme.colors.text.primary};
  }
  
  &:focus-visible {
    outline: 2px solid ${theme.colors.primary.main};
    outline-offset: 2px;
  }
`;

export const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing[6]};
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.colors.grey[100]};
    border-radius: ${theme.borderRadius.full};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.grey[400]};
    border-radius: ${theme.borderRadius.full};
    
    &:hover {
      background: ${theme.colors.grey[500]};
    }
  }
`;

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing[3]};
  padding: ${theme.spacing[6]};
  border-top: 1px solid ${theme.colors.grey[200]};
`;