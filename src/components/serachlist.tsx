import React from 'react';
import { ListChildComponentProps } from 'react-window';
import { DataItem } from '../stores/useItemConfigStore';

interface SearchListProps extends ListChildComponentProps {
    selectItem: (item: DataItem) => void;
}

const SearchList: React.FC<SearchListProps> = ({ index, style, data, selectItem }) => {
    const item = data[index] as DataItem;

    const handleClick = React.useCallback((e: React.MouseEvent) => {
        selectItem(item);
    }, [item]);

    return (
        <div
            className="flex items-center px-4 py-2 hover:bg-base-300 cursor-pointer font-sans text-sm"
            style={style}
            onClick={handleClick}
            onMouseDown={handleClick}
        >
            <span className="mr-2 flex-shrink-0 justify-between-text hover:bg-base-300">{item.item}</span>
            {item.name && (<span className="mr-2 min-w-10 max-w-60 flex-shrink-0 truncate">{item.name}</span>)}
            {item.protocol && (
                <div className="badge badge-success flex-shrink-0 truncate">
                    {item.protocol}
                </div>
            )}
            {item.region && (
                <div className="badge badge-info flex-shrink-0 truncate">
                    {item.region}
                </div>
            )}
        </div>
    );
};

export default React.memo(SearchList);