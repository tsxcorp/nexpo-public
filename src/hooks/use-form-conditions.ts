import { useEffect, useState, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';

/**
 * Các toán tử điều kiện hỗ trợ
 */
export type ConditionOperator =
  | '_eq'
  | '_neq'
  | '_contains'
  | '_gt'
  | '_gte'
  | '_lt'
  | '_lte'
  | '_in'
  | '_nin';

/**
 * Các hành động khi điều kiện khớp
 */
export type ConditionAction =
  | 'show'
  | 'hide'
  | 'required'
  | 'optional'
  | 'readonly'
  | 'set_options'
  | 'set_value';

export interface Condition {
  source_field_id: string;
  operator: ConditionOperator;
  value: string | number | boolean | Array<string | number>;
  action: ConditionAction;
  extra?: {
    options?: Array<{ label: string; value: string | number }>;
    value?: any;
    message?: string;
  };
}

export interface Field {
  id: string;
  name: string;
  type: 'input' | 'textarea' | 'email' | 'number' | 'select' | 'multiselect' | 'file' | 'image';
  options?: any[];
  is_required?: boolean;
  conditions: Condition[];
}

/**
 * Hàm đánh giá điều kiện dựa trên giá trị nguồn và toán tử
 */
export function evaluateCondition(
  sourceValue: any,
  operator: ConditionOperator,
  targetValue: any
): boolean {
  // Chuẩn hóa giá trị nguồn (tránh null/undefined)
  const val = typeof sourceValue === 'string' ? sourceValue.trim() : (sourceValue ?? '');
  const target = typeof targetValue === 'string' ? targetValue.trim() : (targetValue ?? '');

  switch (operator) {
    case '_eq':
      return String(val).toLowerCase() === String(target).toLowerCase();
    case '_neq':
      return String(val).toLowerCase() !== String(target).toLowerCase();
    case '_gt':
      return Number(val) > Number(target);
    case '_gte':
      return Number(val) >= Number(target);
    case '_lt':
      return Number(val) < Number(target);
    case '_lte':
      return Number(val) <= Number(target);
    case '_contains':
      if (Array.isArray(val)) {
        return val.some(v => String(v).toLowerCase() === String(target).toLowerCase());
      }
      return String(val).toLowerCase().includes(String(target).toLowerCase());
    case '_in': {
      const targetList = Array.isArray(target) 
        ? target 
        : (typeof target === 'string' ? target.split(',').map(s => s.trim()) : [target]);
      return targetList.some(v => String(v).toLowerCase() === String(val).toLowerCase());
    }
    case '_nin': {
      const targetList = Array.isArray(target) 
        ? target 
        : (typeof target === 'string' ? target.split(',').map(s => s.trim()) : [target]);
      return !targetList.some(v => String(v).toLowerCase() === String(val).toLowerCase());
    }
    default:
      return false;
  }
}

/**
 * Hook xử lý logic điều kiện cho form động
 */
export function useFormConditions(fields: Field[], form: UseFormReturn<any>) {
  const { watch, setValue, control } = form;
  
  // Trạng thái cho UI - Khởi tạo từ fields để tránh flickering
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    fields.forEach(f => {
      const hasShow = f.conditions?.some((c: any) => (c.item || c).action === 'show');
      initial[f.id] = !hasShow;
    });
    return initial;
  });
  
  const [fieldOptions, setFieldOptions] = useState<Record<string, Array<{ label: string; value: string | number }>>>({});
  
  const [fieldDisabled, setFieldDisabled] = useState<Record<string, boolean>>({});
  
  const [fieldRequired, setFieldRequired] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    fields.forEach(f => {
      initial[f.id] = f.is_required || false;
    });
    return initial;
  });

  // Map để tra cứu Name từ ID và ngược lại
  const { idToNameMap, sourceFieldNames } = useMemo(() => {
    const idMap: Record<string, string> = {};
    const names = new Set<string>();
    
    fields.forEach(f => {
      idMap[f.id] = f.name;
    });

    fields.forEach((f) => {
      f.conditions?.forEach((c: any) => {
        const realCondition = c.item || c;
        const sid = realCondition.source_field_id;
        if (sid) {
          const nameToWatch = idMap[sid] || sid;
          names.add(nameToWatch);
        }
      });
    });

    const resultNames = Array.from(names);
    return { idToNameMap: idMap, sourceFieldNames: resultNames };
  }, [fields]);

  // Watch tất cả các names cần thiết
  const watchedValues = watch(sourceFieldNames);
  
  // Tổng hợp giá trị watch vào map (key là id hoặc name đều lấy được giá trị)
  const watchedMap = useMemo(() => {
    const map: Record<string, any> = {};
    
    sourceFieldNames.forEach((name, index) => {
      // Handle cả trường hợp watch trả về array hoặc object (tùy version/config RHF)
      const val = Array.isArray(watchedValues) 
        ? watchedValues[index] 
        : (watchedValues as any)?.[name];
      map[name] = val;
    });

    // Ánh xạ cả ID sang giá trị để dễ tra cứu trong conditions
    Object.entries(idToNameMap).forEach(([id, name]) => {
      map[id] = map[name];
    });

    return map;
  }, [watchedValues, sourceFieldNames, idToNameMap]);

  const watchedMapString = JSON.stringify(watchedMap);

  useEffect(() => {
    const newVisible: Record<string, boolean> = {};
    const newOptions: Record<string, Array<{ label: string; value: string | number }>> = {};
    const newDisabled: Record<string, boolean> = {};
    const newRequired: Record<string, boolean> = {};
    const currentValues = form.getValues();

    fields.forEach((field) => {
      // Mặc định state cho field
      let isVisible = true;
      let isDisabled = false;
      let isRequired = field.is_required || false;
      let options = fieldOptions[field.id];

      // Tên field dùng trong RHF (Slug/Name)
      const rhfName = field.name;
      const currentFieldValue = currentValues[rhfName];

      const hasShowCondition = field.conditions?.some((c: any) => (c.item || c).action === 'show');
      
      if (hasShowCondition) {
        isVisible = false;
      }

      if (field.conditions && field.conditions.length > 0) {
        field.conditions.forEach((condition: any) => {
          const realCondition = condition.item || condition;
          const sourceValue = watchedMap[realCondition.source_field_id];
          const match = evaluateCondition(sourceValue, realCondition.operator, realCondition.value);

          if (match) {
            switch (realCondition.action) {
              case 'show':
                isVisible = true;
                break;
              case 'hide':
                isVisible = false;
                break;
              case 'readonly':
                isDisabled = true;
                break;
              case 'required':
                isRequired = true;
                break;
              case 'optional':
                isRequired = false;
                // Xóa lỗi required cũ ngay lập tức nếu có
                if (form.formState.errors[rhfName]) {
                  form.clearErrors(rhfName);
                }
                // Nếu trở thành optional, đảm bảo giá trị không phải null/undefined để tránh lỗi backend
                if (currentFieldValue === undefined || currentFieldValue === null) {
                  setValue(rhfName, "", { shouldDirty: false });
                }
                break;
              case 'set_options':
                if (realCondition.extra_options) {
                  options = realCondition.extra_options;
                } else if (realCondition.extra?.options) {
                  options = realCondition.extra.options;
                }
                break;
              case 'set_value':
                const targetVal = realCondition.extra_value !== undefined ? realCondition.extra_value : realCondition.extra?.value;
                if (targetVal !== undefined && currentFieldValue !== targetVal) {
                  setValue(rhfName, targetVal, { shouldValidate: true });
                }
                break;
            }
          }
        });
      }

      newVisible[field.id] = isVisible;
      newDisabled[field.id] = isDisabled;
      newRequired[field.id] = isRequired;
      if (options) {
        newOptions[field.id] = options;
      }

      // Sync giá trị nếu bị ẩn: dùng chuỗi rỗng "" thay vì undefined để thỏa mãn backend
      if (!isVisible && currentFieldValue !== undefined && currentFieldValue !== "") {
         setValue(rhfName, "", { shouldDirty: false });
      }
    });

    setVisible(prev => JSON.stringify(prev) === JSON.stringify(newVisible) ? prev : newVisible);
    setFieldOptions(prev => JSON.stringify(prev) === JSON.stringify(newOptions) ? prev : newOptions);
    setFieldDisabled(prev => JSON.stringify(prev) === JSON.stringify(newDisabled) ? prev : newDisabled);
    setFieldRequired(prev => JSON.stringify(prev) === JSON.stringify(newRequired) ? prev : newRequired);
  }, [watchedMapString, fields, setValue, form, fieldOptions, watchedMap]);

  return {
    visible,
    fieldOptions,
    fieldDisabled,
    fieldRequired,
  };
}

/**
 * MOCK DATA ĐỂ TEST
 * 
 * const mockFields: Field[] = [
 *   {
 *     id: 'field_1',
 *     name: 'Loại khách hàng',
 *     type: 'select',
 *     options: ['Cá nhân', 'Doanh nghiệp'],
 *     is_required: true,
 *     conditions: []
 *   },
 *   {
 *     id: 'field_2',
 *     name: 'Mã số thuế',
 *     type: 'input',
 *     is_required: false,
 *     conditions: [
 *       {
 *         source_field_id: 'field_1',
 *         operator: '_eq',
 *         value: 'Doanh nghiệp',
 *         action: 'show'
 *       },
 *       {
 *         source_field_id: 'field_1',
 *         operator: '_neq',
 *         value: 'Doanh nghiệp',
 *         action: 'hide'
 *       }
 *     ]
 *   }
 * ];
 */
