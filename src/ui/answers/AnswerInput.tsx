import type { Answer } from '../../core/types';
import type { AnswerInputProps } from './types';
import { handleAnswerKeyDown } from './fieldNav';
import NumberInput from './NumberInput';
import ChoiceInput from './ChoiceInput';
import MultiInput from './MultiInput';
import OrderInput from './OrderInput';
import WrittenInput from './WrittenInput';
import CellsInput from './CellsInput';
import NumberLineInput from './NumberLineInput';
import './fieldNav.css';

function Input(props: AnswerInputProps<Answer>) {
  const { answer } = props;
  switch (answer.kind) {
    case 'number':
      return <NumberInput {...props} answer={answer} />;
    case 'choice':
      return <ChoiceInput {...props} answer={answer} />;
    case 'multi':
      return <MultiInput {...props} answer={answer} />;
    case 'order':
      return <OrderInput {...props} answer={answer} />;
    case 'written':
      return <WrittenInput {...props} answer={answer} />;
    case 'cells':
      return <CellsInput {...props} answer={answer} />;
    case 'numberline':
      return <NumberLineInput {...props} answer={answer} />;
  }
}

/**
 * Dispatches to the input component for the answer kind. Enter/Shift+Enter in text fields is handled here
 * for every kind (fieldNav.ts): next empty field, then "Prüfen".
 */
export default function AnswerInput(props: AnswerInputProps<Answer>) {
  if (props.print) return <Input {...props} />;
  return (
    <div className="answer-input" onKeyDownCapture={(e) => handleAnswerKeyDown(e, props.onSubmit)}>
      <Input {...props} />
    </div>
  );
}
