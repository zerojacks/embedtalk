import { invoke } from '@tauri-apps/api/core';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import XmlTree, { getDisplayName } from '../components/xmltree';
import XmlConverter from '../components/xmlconvert';
import { CodeIcon, ComponentsIcon } from '../components/Icons';
import { useItemConfigStore, XmlElement, DataItem } from '../stores/useItemConfigStore';
import SearchList from '../components/serachlist';
import ItemConfigRow from '../components/ItemConfigRow';

export const CardTitle: React.FC<{ element: XmlElement; className?: string }> = ({ element, className }) => {
  const title = getDisplayName(element.name) + (element.attributes?.id ? ` (${element.attributes.id})` : '');

  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}> {/* 将传入的className应用到最外层div */}
      <h3 className="text-lg font-semibold">
        {title}
      </h3>
      {element.attributes?.region && (
        <div className="badge badge-success" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {element.attributes.region ? ` (${element.attributes.region})` : ''}
      </div>
      )}
      {element.attributes?.protocol && ( // 确保这里检查的是protocol属性，而不是重复region
        <div className="badge badge-success" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {element.attributes.protocol}
        </div>
      )}
    </div>
  );
};

export default function Itemconfig() {
  const {
    isResizing,
    splitPosition,
    searchTerm,
    showDropdown,
    selectedItem,
    isLoading,
    allitemlist,
    displaytype,
    allSelectItems,
    filteredData,
    setIsResizing,
    setSplitPosition,
    setSearchTerm,
    setShowDropdown,
    setFilteredData,
    setSelectedItem,
    setIsLoading,
    setAllitemlist,
    setDisplaytype,
    setAllSelectItems,
  } = useItemConfigStore();
  const isSelecting = useRef(false);
  const allSelectItemsRef = useRef(allSelectItems);
  const inputRef = useRef<HTMLInputElement>(null);

  allSelectItemsRef.current = allSelectItems;

  const asyncSearch = async (term: string): Promise<DataItem[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isHex = /^[0-9a-fA-F]+$/.test(term);

        const results = allitemlist.filter(item => {
          if (isHex) {
            const regex = new RegExp(`^${term}`, 'i');
            return regex.test(item.item);
          } else {
            return item.name && item.name.toLowerCase().includes(term.toLowerCase());
          }
        });

        resolve(results);
      }, 300);
    });
  };

  useEffect(() => {
    async function getallitemlist() {
      try {
        const allitemlist = await invoke<DataItem[]>('get_all_config_item_lists');
        setAllitemlist(allitemlist);
      } catch (error) {
        console.error('get_all_config_item_lists error:', error);
      }
    }
    getallitemlist();
  }, []);

  useEffect(() => {
    if (isSelecting.current) {
      isSelecting.current = false;
      return;
    }

    let debounceTimeout: NodeJS.Timeout;
    const performSearch = async () => {
      if (searchTerm.trim() === '') {
        setFilteredData([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await asyncSearch(searchTerm);
        setFilteredData(results);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
        setFilteredData([]);
      } finally {
        setIsLoading(false);
      }
    };

    debounceTimeout = setTimeout(performSearch, 300);

    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [searchTerm]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if(inputRef.current) {
        const currentValue = inputRef.current.value;
        console.log("currentValue", currentValue);
        const curitem = {} as DataItem;
        curitem.item = currentValue;
        selectItem(curitem);
      }
    }
  };

  const selectItem = useCallback(async (item: DataItem) => {
    console.log("select item", item);
    isSelecting.current = true;
    // setSearchTerm(item.item);
    // setShowDropdown(false);
    let updatedItem = { ...item, xmlElement: {} as XmlElement };
    try {
      const element = await invoke<XmlElement>('get_protocol_config_item', { value: JSON.stringify(item) });
      updatedItem = { ...item, xmlElement: element };
      // setSelectXml(element);
    } catch (error) {
      console.error('get_protocol_config_item error:', error);
      // setSelectXml({} as XmlElement);
    }
    console.log("select item xml", updatedItem)
    updateItemIntoAllselectItem(updatedItem);
  }, [searchTerm]);

  const startResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isResizing) {
      const container = e.currentTarget;
      const containerRect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setSplitPosition(Math.min(Math.max(newPosition, 30), 80));
    }
  }, [isResizing]);

  const updateItemIntoAllselectItem = (item: DataItem) => {
    const currentAllSelectItems = allSelectItemsRef.current;
    const itemIndex = currentAllSelectItems.findIndex(existingItem => 
      existingItem.item === item.item &&
      existingItem.protocol === item.protocol &&
      existingItem.region === item.region
    );
    console.log("updateItemIntoAllselectItem", item);
    if (itemIndex === -1) {
      // 如果没有找到，添加新项
      setAllSelectItems([...currentAllSelectItems, item]);
    } else {
      // 如果找到了，更新该项
      const newItems = [...currentAllSelectItems];
      newItems[itemIndex] = item;
      setAllSelectItems(newItems);
    }
  };


  useEffect(() => {
    console.log("allSelectItems", allSelectItems);
  }, [allSelectItems]);


  const itemConfigSelect = async (item: DataItem) => {
    console.log("itemConfigSelect:", item);
    isSelecting.current = true;
    if (!item.xmlElement) {
      try {
        const element = await invoke<XmlElement>('get_protocol_config_item', { value: JSON.stringify(item) });
        const updatedItem = { ...item, xmlElement: element };
        updateItemIntoAllselectItem(updatedItem)
        item.xmlElement = element;
      } catch (error) {
        const updatedItem = { ...item, xmlElement: {} as XmlElement };
        updateItemIntoAllselectItem(updatedItem)
        item.xmlElement = {} as XmlElement;
      }
    } 
    setSelectedItem(item);
  }

  const handleXmlElementChange = (newXmlElement: XmlElement) => {
    selectedItem.xmlElement = newXmlElement;
    updateItemIntoAllselectItem(selectedItem)
    console.log('Updated XmlElement:', newXmlElement);
  };

  return (
    <div className="w-full h-full">
      <div
        className="relative w-full h-full flex"
        onMouseMove={resize}
        onMouseUp={stopResize}
        onMouseLeave={stopResize}
      >
        <div
          className="h-full overflow-auto"
          style={{ width: `${splitPosition}%` }}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 m-2 relative">
              <div className="flex flex-col w-full">
                <div className="flex items-center mb-2">
                  <label className="flex-shrink-0 mr-2">数据标识</label>
                  <div className="relative flex-grow">
                    <label className="input input-bordered flex items-center gap-2 w-full">
                      <input
                        ref={inputRef}
                        type="text"
                        className="grow"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => searchTerm.trim() !== '' && setShowDropdown(true)}
                      />
                      {isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="h-4 w-4 opacity-70"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </label>
                    {showDropdown && filteredData.length > 0 && (
                      <div
                        className="absolute z-10 w-full mt-1 bg-base-200 border select-primary rounded-md shadow-lg textarea-bordered"
                        onMouseLeave={() => setShowDropdown(false)}
                      >
                        <FixedSizeList
                          height={Math.min(200, filteredData.length * 40)}
                          itemCount={filteredData.length}
                          itemSize={40}
                          width="100%"
                          itemData={filteredData}
                        >
                          {(props) => <SearchList {...props} selectItem={selectItem} />}
                        </FixedSizeList>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start w-full flex-col mt-4">
                  <p>已选择数据项</p>
                  <div className="w-full h-full p-4 border rounded-md textarea-bordered">
                    <FixedSizeList
                      height={Math.min(200, allSelectItems.length * 40)}
                      itemCount={allSelectItems.length}
                      itemSize={40}
                      width="100%"
                      itemData={allSelectItems}
                    >
                      {(props) => <ItemConfigRow {...props} selectItem={itemConfigSelect} />}
                    </FixedSizeList>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute top-0 bottom-0 w-px bg-splize cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
          style={{ left: `${splitPosition}%` }}
          onMouseDown={startResize}
        />

        <div
          className="h-full overflow-auto"
          style={{ width: `${100 - splitPosition}%` }}
        >
          <div className="p-4 w-full h-full flex flex-col">
            {selectedItem.xmlElement && (
              <div className="flex mb-4 flex-row justify-between items-center sticky top-0 z-10 bg-base-200 shadow-md">
                <CardTitle element={selectedItem.xmlElement} className="ml-2"/>
                <div role="tablist" className="tabs tabs-boxed">
                  <label role="tab" className={`tab ${displaytype === 'compents' ? 'tab-active' : ''}`} onClick={() => setDisplaytype('compents')}>
                    <ComponentsIcon className="w-5 h-5" />
                  </label>                
                  <label role="tab" className={`tab ${displaytype === 'xml' ? 'tab-active' : ''}`} onClick={() => setDisplaytype('xml')}>
                    <CodeIcon  className="w-5 h-5" />
                  </label>  
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {selectedItem.xmlElement && (displaytype === 'compents') && (
                <XmlTree data={selectedItem.xmlElement} onUpdate={handleXmlElementChange}/>
              )}
              {selectedItem.xmlElement && (displaytype === 'xml') && (
                <div className="relative w-full h-full">
                  <XmlConverter
                    initialXml={selectedItem.xmlElement}
                    onXmlElementChange={handleXmlElementChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}