// @flow
import React, { Component } from "react";
import { Table, Icon } from "semantic-ui-react";
import md5 from "md5";
import _ from "lodash";
import { inspect } from "util";

import type { StaticDatagrid } from "./datagrid";
import ColumnModel from "./columnModel";
import type { ColumnModelType } from "./columnModel";
import { PaginationControls } from "./plugins/pagination";
import { EditControls } from "./plugins/edit";
import { LocalStore } from "./store";
import type {
  LocalStore as LocalStoreType,
  RemoteStore as RemoteStoreType,
} from "./store";

type Props = {
  data: Array<Object>,
  editable: boolean,
  startEditingContent: Function,
  columnModel: Array<Object>,
  pageSize: number,
  cellComponent: Component<*>,
  editButtonLabel: string,
};

type StoreType = LocalStoreType | RemoteStoreType;

type State = {
  store: StoreType,
  data: Array<Object>,
  activeColumn: any
};

type UpdateStateFunctionType = (store: StoreType) => Array<Object>;

const generateObjectArrayHash = (arr: Array<Object>) => md5(inspect(arr));

export default (Grid: StaticDatagrid) => class GridHOC extends Component<Props, State> {
  updateGridState: Function;

  updateGridColumnState: Function;

  buildTableHeaders: Function;

  buildTableFooter: Function;

  colModel: ColumnModelType;

  constructor(props: Props) {
    super(props);
    this.colModel = new ColumnModel(props.columnModel);
    this.buildTableHeaders = this.buildTableHeaders.bind(this);
    this.buildTableFooter = this.buildTableFooter.bind(this);
    this.updateGridState = this.updateGridState.bind(this);
    this.state = {
      store: new LocalStore(this.props.data),
      data: this.props.data,
      activeColumn: null,
    };
  }

  componentDidMount() {
    this.setState({ store: new LocalStore(this.props.data) });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.data !== this.props.data) {
      if (this.state.store && this.state.store instanceof LocalStore) {
        this.state.store.clear();
        // eslint-disable-next-line
        this.setState({ store: new LocalStore(this.props.data) });
      }
    }

    if (!_.isEqual(prevProps.columnModel, this.props.columnModel)) {
      this.colModel = new ColumnModel(this.props.columnModel);
    }
  }

  componentWillUnmount() {
    this.state.store.clear();
    this.setState({});
  }

  updateGridState(updateState: UpdateStateFunctionType) {
    const data = updateState(this.state.store);
    if (data && Array.isArray(data)) {
      this.setState({ data });
    }
  }

  updateGridColumnState(columnName: any, isAscending: any, format: string, getValue: any) {
    const data = this.state.store.getData();
    const property = columnName;
    if (format === 'number') {
      data.sort((a, b) => {
        const first = parseFloat(getValue ? getValue(a[property] || 0) : a[property] || 0);
        const second = parseFloat(getValue ? getValue(b[property] || 0) : b[property] || 0);
        return isAscending ? first - second : second - first;
      });
    }

    if (format === 'string') {
      data.sort((a, b) => {
        const first = getValue ? getValue(b[property]).toLowerCase() : b[property].toLowerCase();
        const second = getValue ? getValue(a[property]).toLowerCase() : a[property].toLowerCase();
        const ascending = first > second ? -1 : 1;
        const descending = second > first ? -1 : 1;
        return isAscending ? ascending : descending;
      });
    }

    if (format === 'date') {
      data.sort((a, b) => {
        const da = new Date(a[property]);
        const db = new Date(b[property]);
        return isAscending ? da - db : db - da;
      });
    }

    if (data && Array.isArray(data)) {
      this.setState({ data });
    }
  }

  buildTableHeaders() {
    return (
      <Table.Header>
        <Table.Row>
          {
            this.props.cellComponent
              ? <Table.HeaderCell colSpan={this.colModel.get().length} />
              : this.colModel.get().map((item) => (
                <Table.HeaderCell
                  key={item.dataIndex}
                  onClick={() => {
                    if (item.sortable !== undefined) {
                      item.sortable = !item.sortable;
                      this.setState({ activeColumn: item.dataIndex });
                      this.updateGridColumnState(item.dataIndex, item.sortable, item.sortingType, item.getValue,);
                    }
                  }}
                  className={item.sortable !== undefined ? 'tableHeader' : ''}
                >
                  {item.name}
                  {item.dataIndex === this.state.activeColumn
                    ? (
                      <Icon
                        link
                        name={item.sortable ? 'caret up' : 'caret down'}
                      />
                    ) : ''}
                </Table.HeaderCell>
              ))
          }
        </Table.Row>
      </Table.Header>
    );
  }

  buildTableFooter() {
    const data = this.state.store.getData();
    const {
      editable, startEditingContent, editButtonLabel,
    } = this.props;
    return (
      <Table.Footer fullWidth>
        <Table.Row>
          {
            editable
            && (
              <EditControls
                startEditingContent={startEditingContent}
                editButtonLabel={editButtonLabel}
              />
            )
          }
          <PaginationControls
            key={generateObjectArrayHash(data)}
            updateGridState={this.updateGridState}
            totalRecords={data && data.length}
            colSpan={this.colModel.get().length}
            pageSize={this.props.pageSize}
          />
        </Table.Row>
      </Table.Footer>
    );
  }

  render() {
    const { columnModel, data, ...rest } = this.props;
    return (
      <Grid
        columnModel={this.colModel}
        buildTableHeaders={this.buildTableHeaders}
        buildTableFooter={this.buildTableFooter}
        data={this.state.data}
        {...rest}
      />
    );
  }
};
