
import { AngularResourceProxy, createAction, createThunkAction } from "metabase/lib/redux";
import { reset } from 'redux-form';
import { normalize, Schema, arrayOf } from 'normalizr';

const label = new Schema('labels');
const LabelApi = new AngularResourceProxy("Label", ["list", "create", "update", "delete"]);

import i from "icepick";
import _ from "underscore";

const LOAD_LABELS = 'metabase/labels/LOAD_LABELS';
const EDIT_LABEL = 'metabase/labels/EDIT_LABEL';
const SAVE_LABEL = 'metabase/labels/SAVE_LABEL';
const DELETE_LABEL = 'metabase/labels/DELETE_LABEL';

export const loadLabels = createThunkAction(LOAD_LABELS, () => {
    return async (dispatch, getState) => {
        let response = await LabelApi.list();
        return normalize(response, arrayOf(label));
    }
});

export const saveLabel = createThunkAction(SAVE_LABEL, (values) => {
    return async (dispatch, getState) => {
        try {
            let response;
            if (values.id == null) {
                response = await LabelApi.create(values);
            } else {
                response = await LabelApi.update(values);
            }
            if (response.id != null) {
                dispatch(reset("label"));
            }
            return response;
        } catch (e) {
            // redux-form expects an object with either { field: error } or { _error: error }
            if (e.data && e.data.errors) {
                throw e.data.errors;
            } else if (e.data && e.data.message) {
                throw { _error: e.data.message };
            } else {
                throw { _error: "An unknown error occured" };
            }
        }
    }
});

export const deleteLabel = createThunkAction(DELETE_LABEL, (id) => {
    return async (dispatch, getState) => {
        try {
            await LabelApi.delete({ id });
            return id;
        } catch (e) {
            // TODO: handle error
            return null;
        }
    }
});

export const editLabel = createAction(EDIT_LABEL);

const initialState = {
    entities: {
        labels: {}
    },
    labelIds: null,
    error: null,
    editing: null
};

export default function(state = initialState, { type, payload, error }) {
    if (payload && payload.entities) {
        state = i.assoc(state, "entities", i.merge(state.entities, payload.entities));
    }
    if (payload && payload.message) {
        state = i.assoc(state, "message", payload.message);
    }

    switch (type) {
        case LOAD_LABELS:
            if (error) {
                return { ...state, error: payload };
            } else {
                return { ...state, labelIds: payload.result, error: null };
            }
        case SAVE_LABEL:
            if (error || payload == null) {
                return state;
            }
            return {
                ...state,
                entities: {
                    ...state.entities,
                    labels: { ...state.entities.labels, [payload.id]: payload }
                },
                labelIds: _.uniq([...state.labelIds, payload.id]),
                editing: state.editing === payload.id ? null : state.editing
            };
        case EDIT_LABEL:
            return { ...state, editing: payload };
        case DELETE_LABEL:
            if (payload == null) {
                return state;
            }
            return {
                ...state,
                entities: {
                    ...state.entities,
                    labels: { ...state.entities.labels, [payload]: undefined }
                },
                labelIds: state.labelIds.filter(id => id !== payload)
            };
        default:
            return state;
    }
}
