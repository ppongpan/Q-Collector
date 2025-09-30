import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisV, faArrowUp, faArrowDown, faCopy, faTrashAlt
} from '@fortawesome/free-solid-svg-icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './dropdown-menu';

/**
 * FieldOptionsMenu - Field options dropdown for field management
 * Handles field operations (move, duplicate, delete)
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Function} props.onRemove - Field removal callback
 * @param {Function} props.onDuplicate - Field duplication callback
 * @param {Function} props.onMoveUp - Move field up callback
 * @param {Function} props.onMoveDown - Move field down callback
 * @param {boolean} props.canMoveUp - Whether field can move up
 * @param {boolean} props.canMoveDown - Whether field can move down
 */
const FieldOptionsMenu = React.memo(({
  field,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}) => {

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          title="ตัวเลือกเพิ่มเติม"
          className="flex items-center justify-center opacity-70 hover:opacity-100 w-7 h-7 cursor-pointer transition-all duration-300"
          style={{
            background: 'transparent',
            border: 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="glass-container min-w-48">
        {/* Move Up/Down Options */}
        {canMoveUp && (
          <DropdownMenuItem onClick={onMoveUp}>
            <FontAwesomeIcon icon={faArrowUp} className="mr-2 w-4 h-4" />
            ย้ายขึ้น
          </DropdownMenuItem>
        )}

        {canMoveDown && (
          <DropdownMenuItem onClick={onMoveDown}>
            <FontAwesomeIcon icon={faArrowDown} className="mr-2 w-4 h-4" />
            ย้ายลง
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={onDuplicate}>
          <FontAwesomeIcon icon={faCopy} className="mr-2 w-4 h-4" />
          ทำสำเนา
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onRemove} className="text-destructive">
          <FontAwesomeIcon icon={faTrashAlt} className="mr-2 w-4 h-4" />
          ลบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

FieldOptionsMenu.displayName = 'FieldOptionsMenu';

export default FieldOptionsMenu;