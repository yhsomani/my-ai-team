#!/bin/bash
set -e

NAME=""
IS_MF=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --mf)
      IS_MF=true
      shift
      ;;
    *)
      NAME="$1"
      shift
      ;;
  esac
done

if [ -z "$NAME" ]; then
    echo "Usage: ./create-component.sh <name> [--mf]"
    exit 1
fi

FRONTEND_DIR="apps/frontend"
COMPONENT_DIR="${FRONTEND_DIR}/src/shared/components/${NAME}"

mkdir -p "$COMPONENT_DIR"

cat > "${COMPONENT_DIR}/${NAME}.tsx" << TSEOF
import styles from './${NAME}.module.css';

interface ${NAME}Props {
  // Add props here
}

export default function ${NAME}({}: ${NAME}Props) {
  return (
    <div className={styles.${NAME}}>
      {/* Component content */}
    </div>
  );
}
TSEOF

cat > "${COMPONENT_DIR}/${NAME}.module.css" << CSSEOF
.${NAME} {
  /* Styles */
}
CSSEOF

if [ "$IS_MF" = true ]; then
    echo "Creating micro-frontend remote for: $NAME"
    # Add MF-specific configuration
fi

echo "Created component: $NAME"
echo "Location: $COMPONENT_DIR"
