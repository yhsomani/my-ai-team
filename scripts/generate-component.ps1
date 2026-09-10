#!/bin/bash
# =============================================================================
# Frontend Component Generator - Auto-generates React components
# =============================================================================
# Usage: ./scripts/generate-component.sh <component-name> [component-type]
# Example: ./scripts/generate-component.sh Button atom
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default paths
COMPONENT_DIR="apps/frontend/src/components"
SERVICE_DIR="apps/frontend/src/services"

# Parse arguments
COMPONENT_NAME=$1
COMPONENT_TYPE=${2:-"molecule"}

if [ -z "$COMPONENT_NAME" ]; then
    echo -e "${RED}Error: Component name required${NC}"
    echo "Usage: $0 <component-name> [component-type]"
    echo "Types: atom, molecule, organism, page"
    exit 1
fi

# Validate component type
VALID_TYPES=("atom" "molecule" "organism" "page")
if [[ ! " ${VALID_TYPES[@]} " =~ " ${COMPONENT_TYPE} " ]]; then
    echo -e "${RED}Invalid component type: $COMPONENT_TYPE${NC}"
    echo "Valid types: ${VALID_TYPES[@]}"
    exit 1
fi

echo -e "${GREEN}Generating $COMPONENT_NAME ($COMPONENT_TYPE)...${NC}"

# Determine output directory based on type
case $COMPONENT_TYPE in
    "atom")
        TARGET_DIR="$COMPONENT_DIR/atoms"
        ;;
    "molecule")
        TARGET_DIR="$COMPONENT_DIR/molecules"
        ;;
    "organism")
        TARGET_DIR="$COMPONENT_DIR/organisms"
        ;;
    "page")
        TARGET_DIR="$COMPONENT_DIR/../pages"
        ;;
esac

# Create directory if not exists
mkdir -p "$TARGET_DIR"

# Generate component file
COMPONENT_FILE="$TARGET_DIR/${COMPONENT_NAME}.tsx"

cat > "$COMPONENT_FILE" << EOF
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ${COMPONENT_NAME}Props {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const ${COMPONENT_NAME}: React.FC<${COMPONENT_NAME}Props> = ({
  className,
  children,
  onClick,
  disabled = false
}) => {
  return (
    <div
      className={twMerge(
        'flex items-center justify-center',
        'transition-colors duration-200',
        'hover:bg-opacity-90',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      {children || '${COMPONENT_NAME}'}
    </div>
  );
};

export default ${COMPONENT_NAME};
EOF

# Generate index file in parent directory
INDEX_FILE="$COMPONENT_DIR/index.ts"
if [ ! -f "$INDEX_FILE" ]; then
    cat > "$INDEX_FILE" << 'EOF'
// Component exports
export * from './atoms';
export * from './molecules';
export * from './organisms';
EOF
fi

echo -e "${GREEN}✓ Component created: $COMPONENT_FILE${NC}"
echo ""
echo "Next steps:"
echo "  1. Add to your page: import { $COMPONENT_NAME } from '../components'"
echo "  2. Add tests and wire it through the relevant feature module"
