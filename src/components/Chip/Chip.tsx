import React from 'react';
import { Ripple } from '../Ripple/Ripple';
import styles from './Chip.module.scss';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'limit-break' | 'core' | 'info' | 'non-selectable';
    size?: 'default' | 'small';
    selectable?: boolean;
    readOnly?: boolean;
    children?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
    variant = 'default',
    size = 'default',
    selectable = true,
    readOnly = false,
    className = '',
    children,
    type = 'button',
    ...props
}) => {
    const isNonSelectable = variant === 'non-selectable' || !selectable;
    const isInteractive = !isNonSelectable && !readOnly;

    const variantClass = variant === 'limit-break'
        ? styles['variant-limit-break']
        : variant === 'core'
            ? styles['variant-core']
            : variant === 'info'
                ? styles['variant-info']
                : variant === 'non-selectable'
                    ? styles['variant-non-selectable']
                    : styles['variant-default'];

    const sizeClass = size === 'small' ? styles['size-small'] : '';
    const nonSelectableClass = isNonSelectable ? styles['non-selectable'] : '';
    const readOnlyClass = readOnly ? styles.readonly : '';

    return (
        <button
            type={type}
            tabIndex={!isInteractive ? -1 : props.tabIndex}
            aria-readonly={readOnly || undefined}
            className={`${styles['chip-button']} ${variantClass} ${sizeClass} ${nonSelectableClass} ${readOnlyClass} ${className}`.trim()}
            {...props}
        >
            {children}
            {!props.disabled && isInteractive && <Ripple />}
        </button>
    );
};
