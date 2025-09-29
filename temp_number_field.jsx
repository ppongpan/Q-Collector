      case 'number':
        const [displayValue, setDisplayValue] = useState(() => {
          // Initialize with formatted value if exists
          if (fieldValue) {
            return isValidNumber(fieldValue) ? formatNumberInput(fieldValue).formattedValue : fieldValue;
          }
          return '';
        });

        // Update display value when field value changes (e.g., from loaded data)
        useEffect(() => {
          if (fieldValue !== undefined) {
            const newDisplayValue = isValidNumber(fieldValue)
              ? formatNumberInput(fieldValue).formattedValue
              : fieldValue || '';
            setDisplayValue(newDisplayValue);
          }
        }, [fieldValue]);

        return (
          <div key={field.id} data-field-id={field.id} className="space-y-1">
            <GlassInput
              type="text"
              inputMode="numeric"
              label={field.title}
              required={field.required}
              placeholder={field.placeholder || `กรอก${field.title}`}
              value={displayValue}
              onChange={(e) => {
                const newDisplayValue = handleNumberInputChange(field.id, e.target.value, displayValue);
                setDisplayValue(newDisplayValue);
              }}
              onBlur={(e) => {
                // Ensure final formatting on blur
                const cleanValue = parseNumberInput(e.target.value);
                if (isValidNumber(cleanValue)) {
                  const finalFormatted = formatNumberInput(cleanValue).formattedValue;
                  setDisplayValue(finalFormatted);
                }
              }}
              hasValidationError={hasError || (isFieldTouched && fieldError)}
            />
            <FieldErrorAlert error={isFieldTouched && fieldError ? fieldError : null} />
          </div>
        );