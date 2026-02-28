import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      // Material Web Buttons
      "md-filled-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
      };
      "md-outlined-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
      };
      "md-text-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
      };

      // Icon
      "md-icon": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;

      // Text Field
      "md-outlined-text-field": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        value?: string;
        type?: string;
        placeholder?: string;
        disabled?: boolean;
      };

      // Select
      "md-outlined-select": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        value?: string;
      };
      "md-select-option": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string;
      };

      // Dialog
      "md-dialog": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        open?: boolean;
        onClosed?: (e: CustomEvent) => void;
      };

      // Chips
      "md-filter-chip": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        selected?: boolean;
        removable?: boolean;
      };
    }
  }
}

// Allow CSS custom properties
declare module "react" {
  namespace JSX {
    interface CSSProperties {
      [key: `--${string}`]: string | number | undefined;
    }
  }
}
