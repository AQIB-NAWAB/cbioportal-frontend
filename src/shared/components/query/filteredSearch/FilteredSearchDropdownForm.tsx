import * as React from 'react';
import { FunctionComponent } from 'react';
import { CancerTreeSearchFilter } from 'shared/lib/textQueryUtils';
import {
    AndSearchClause,
    ISearchClause,
    NotSearchClause,
    Phrase,
    QueryUpdate,
} from 'shared/components/query/SearchClause';

export type FilteredSearchDropdownFormProps = {
    query: ISearchClause[];
    filterConfig: CancerTreeSearchFilter[];
    onChange: (change: QueryUpdate) => void;
};

export const FilteredSearchDropdownForm: FunctionComponent<FilteredSearchDropdownFormProps> = props => {
    return (
        <ul
            className="dropdown-menu"
            style={{
                width: '300px',
            }}
        >
            {props.filterConfig.map(filter => {
                return (
                    <FilterFormField
                        filter={filter}
                        clauses={props.query}
                        onChange={props.onChange}
                    />
                );
            })}
        </ul>
    );
};

/**
 * Can be extended with additional input fields
 */
export type FilterField = CheckboxFilterField | ListFilterField;

/**
 * Options are checked when found in query
 */
type CheckboxFilterField = {
    input: typeof FilterCheckbox;
    label: string;
    options: string[];
};

/**
 * Options disappear when found in query:
 */
type ListFilterField = {
    input: typeof FilterList;
    options: string[];
};

type FieldProps = {
    filter: CancerTreeSearchFilter;
    clauses: ISearchClause[];
    onChange: (change: QueryUpdate) => void;
};

export const FilterFormField: FunctionComponent<FieldProps> = props => {
    const inputField = props.filter.form.input;
    return (
        <div
            className={`filter-form-field ${props.filter.phrasePrefix}`}
            style={{
                margin: '0.5em',
            }}
        >
            {React.createElement(inputField, props)}
        </div>
    );
};

export const FilterCheckbox: FunctionComponent<FieldProps> = props => {
    const form = props.filter.form as CheckboxFilterField;
    const prefix = props.filter.phrasePrefix || '';
    let checkedPhrases: Phrase[] = [];
    let uncheckedPhrases: Phrase[] = [];

    const phrases = createPhrases(prefix, form.options);
    const relevantClauses = props.clauses.filter(c =>
        phrases.find(p => c.contains(p))
    );

    for (const phrase of phrases) {
        const clause = relevantClauses.find(c => c.contains(phrase));
        const isChecked = (clause && clause.isAnd()) || !relevantClauses.length;
        if (isChecked) {
            checkedPhrases.push(phrase);
        } else {
            uncheckedPhrases.push(phrase);
        }
    }

    return (
        <div className="filter-checkbox">
            <span>{form.label}</span>
            <div>
                {phrases.map((option: Phrase) => {
                    const id = `input-${option.phrase}`;
                    const isChecked = checkedPhrases.includes(option);
                    return (
                        <span
                            style={{
                                padding: '0 1em 0 0',
                            }}
                        >
                            <input
                                type="checkbox"
                                id={id}
                                value={option.phrase}
                                checked={isChecked}
                                onClick={() => {
                                    const newState = !isChecked;
                                    updatePhrases(option, newState);
                                    const update = createUpdate(
                                        uncheckedPhrases,
                                        checkedPhrases
                                    );
                                    props.onChange(update);
                                }}
                                style={{
                                    display: 'inline-block',
                                }}
                            />
                            <label
                                htmlFor={id}
                                style={{
                                    display: 'inline-block',
                                    padding: '0 0 0 0.2em',
                                }}
                            >
                                {option.phrase}
                            </label>
                        </span>
                    );
                })}
            </div>
        </div>
    );

    function createPhrases(prefix: string, options: string[]): Phrase[] {
        return options.map(option => {
            const textRepresentation = `${prefix}:${option}`;
            return {
                phrase: option,
                fields: props.filter.nodeFields,
                textRepresentation,
            };
        });
    }

    function updatePhrases(phrase: Phrase, checked?: boolean) {
        if (checked) {
            checkedPhrases.push(phrase);
            uncheckedPhrases = uncheckedPhrases.filter(as => as !== phrase);
        } else {
            uncheckedPhrases.push(phrase);
            checkedPhrases = checkedPhrases.filter(as => as !== phrase);
        }
    }
};

/**
 * Create query update
 * while trying to keep query as short as possible
 * - if only and: remove all
 * - if only not: create not
 * - if more and: create not, remove and
 * - if more not: create and, remove not
 */
export function createUpdate(not: Phrase[], and: Phrase[]): QueryUpdate {
    const toAdd: ISearchClause[] = [];
    const toRemove: Phrase[] = [];

    if (!not.length) {
        and.forEach(p => toRemove.push(p));
    } else if (!and.length) {
        not.forEach(p => toAdd.push(new NotSearchClause(p)));
    } else if (and.length <= not.length) {
        and.forEach(p => toAdd.push(new AndSearchClause([p])));
        not.forEach(p => toRemove.push(p));
    } else {
        and.forEach(p => toRemove.push(p));
        not.forEach(p => toAdd.push(new NotSearchClause(p)));
    }
    return { toAdd, toRemove };
}

export const FilterList: FunctionComponent<FieldProps> = props => {
    const form = props.filter.form as ListFilterField;
    const prefix = props.filter.phrasePrefix;
    return (
        <ul>
            {form.options.map(option => {
                const textRepresentation = `${prefix}:${option}`;
                const clause = new AndSearchClause([
                    {
                        phrase: option,
                        fields: props.filter.nodeFields,
                        textRepresentation,
                    },
                ]);
                return (
                    <li className="menu-item">
                        <a
                            tabIndex={-1}
                            onClick={() => props.onChange({ toAdd: [clause] })}
                        >
                            {option}
                        </a>
                    </li>
                );
            })}
        </ul>
    );
};
