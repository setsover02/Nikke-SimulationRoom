import React from 'react';
import { Ripple } from '../Ripple/Ripple';
import styles from './Chip.module.scss';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'limit-break' | 'core' | 'non-selectable';
    size?: 'default' | 'small';
    selectable?: boolean;
    children?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
    variant = 'default',
    size = 'default',
    selectable = true,
    className = '',
    children,
    type = 'button',
    ...props
}) => {
    const isNonSelectable = variant === 'non-selectable' || !selectable;

    const variantClass = variant === 'limit-break'
        ? styles['variant-limit-break']
        : variant === 'core'
            ? styles['variant-core']
            : variant === 'non-selectable'
                ? styles['variant-non-selectable']
                : styles['variant-default'];

    const sizeClass = size === 'small' ? styles['size-small'] : '';
    const nonSelectableClass = isNonSelectable ? styles['non-selectable'] : '';

    return (
        <button
            type={type}
            tabIndex={isNonSelectable ? -1 : props.tabIndex}
            className={`${styles['chip-button']} ${variantClass} ${sizeClass} ${nonSelectableClass} ${className}`.trim()}
            {...props}
        >
            {children}
            {!props.disabled && !isNonSelectable && <Ripple />}
        </button>
    );
};
