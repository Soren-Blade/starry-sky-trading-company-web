/**
 * 根据class关键字对工具数组进行分类
 * @param {Array} tools - 工具数组
 * @param {Object} options - 配置选项
 * @returns {Object} 分类后的对象
 */
function classifyToolsByClass(tools, options = {}) {
  const {
    keepOriginal = true,         // 是否保留原始对象
    sortByOrder = true,          // 是否按照sort_order排序
    sortDirection = 'asc',       // 排序方向: 'asc' 或 'desc'
    includeStats = false,        // 是否包含统计信息
    customClassMapping = {},     // 自定义class映射
    includeAllCategory = true,   // 是否包含"all"分类
    preserveAllTools = true,     // 是否在all中保留所有工具数据
    allIcon = '🔧',             // all分类的图标
    allName = '全部工具',        // all分类的名称
    allSortOrder = 0            // all分类的排序位置
  } = options;

  if (!Array.isArray(tools)) {
    throw new Error('tools参数必须是一个数组');
  }

  // 使用自定义class映射
  const classMapping = {
    video: '视频工具',
    image: '图片处理',
    dev: '开发工具',
    text: '文本工具',
    audio: '音频工具',
    pdf: 'PDF工具',
    code: '代码工具',
    ...customClassMapping
  };

  // 初始化数据结构
  const classified = {};
  const stats = {
    totalTools: tools.length,
    classCounts: {},
    classNames: {},
    classIcons: {} // 存储每个分类的图标（从工具中获取）
  };

  // 处理所有工具，确保数据一致性
  const processedTools = tools.map(tool => {
    const toolClass = tool.class;
    const className = tool.class_name || classMapping[toolClass] || toolClass;
    
    // 存储分类信息
    if (!stats.classNames[toolClass]) {
      stats.classNames[toolClass] = className;
    }
    
    // 记录分类图标（从第一个工具中获取）
    if (!stats.classIcons[toolClass] && tool.icon) {
      stats.classIcons[toolClass] = tool.icon;
    }

    // 构建工具数据
    let toolData;
    if (keepOriginal) {
      // 保留原始数据，但确保有必要的字段
      toolData = {
        ...tool,
        class: toolClass,
        class_name: className,
        display_name: tool.display_name || `${className} - ${tool.tool_name}`,
        sort_order: tool.sort_order || 999,
        collection_count: tool.collection_count || 0,
        is_new: tool.is_new || false
      };
    } else {
      // 精简版数据
      toolData = {
        id: tool.id,
        class: toolClass,
        class_name: className,
        tool_name: tool.tool_name,
        tool_slug: tool.tool_slug,
        description: tool.description,
        tool_path: tool.tool_path,
        icon: tool.icon, // 使用传入的icon
        icon_url: tool.icon_url,
        collection_count: tool.collection_count || 0,
        sort_order: tool.sort_order || 999,
        is_new: tool.is_new || false,
        display_name: tool.display_name || `${className} - ${tool.tool_name}`,
        created_at: tool.created_at,
        updated_at: tool.updated_at
      };
    }

    return toolData;
  });

  // 按分类分组
  processedTools.forEach(toolData => {
    const toolClass = toolData.class;
    
    // 初始化分类数组
    if (!classified[toolClass]) {
      classified[toolClass] = [];
      stats.classCounts[toolClass] = 0;
    }

    classified[toolClass].push(toolData);
    stats.classCounts[toolClass]++;
  });

  // 对每个分类内的工具进行排序
  if (sortByOrder) {
    Object.keys(classified).forEach(toolClass => {
      classified[toolClass].sort((a, b) => {
        const orderA = a.sort_order || 999;
        const orderB = b.sort_order || 999;
        
        return sortDirection === 'desc' ? orderB - orderA : orderA - orderB;
      });
    });
  }

  // 对分类本身进行排序（按第一个工具的sort_order）
  const sortedClassified = {};
  const sortedClasses = Object.keys(classified).sort((a, b) => {
    const orderA = classified[a][0]?.sort_order || 999;
    const orderB = classified[b][0]?.sort_order || 999;
    return orderA - orderB;
  });

  sortedClasses.forEach(toolClass => {
    sortedClassified[toolClass] = classified[toolClass];
  });

  // 构建分类信息数组（不包含all）
  const regularClasses = sortedClasses.map(toolClass => {
    const categoryTools = sortedClassified[toolClass];
    const mostPopularTool = [...categoryTools]
      .sort((a, b) => (b.collection_count || 0) - (a.collection_count || 0))[0];
    
    return {
      class: toolClass,
      class_name: stats.classNames[toolClass],
      count: stats.classCounts[toolClass],
      icon: stats.classIcons[toolClass] || getDefaultIcon(toolClass),
      sort_order: categoryTools[0]?.sort_order || 999,
      popular_tool: mostPopularTool
        ? {
            name: mostPopularTool.tool_name,
            collection_count: mostPopularTool.collection_count,
          }
        : null,
      has_new_tools: categoryTools.some((tool) => tool.is_new),
      tools: categoryTools,
    }
  })

  // 构建完整的classes数组（包含all分类）
  const classes = [];
  
  // 如果包含all分类，添加到classes数组的最前面
  if (includeAllCategory) {
    // 获取all分类的工具数据
    const allTools = preserveAllTools 
      ? processedTools 
      : regularClasses.reduce((acc, category) => {
          acc.push(...category.tools);
          return acc;
        }, []);
    
    // 对all分类的工具进行排序
    if (sortByOrder) {
      allTools.sort((a, b) => {
        const orderA = a.sort_order || 999;
        const orderB = b.sort_order || 999;
        return sortDirection === 'desc' ? orderB - orderA : orderA - orderB;
      });
    }
    
    const mostPopularAllTool = [...allTools]
      .sort((a, b) => (b.collection_count || 0) - (a.collection_count || 0))[0];
    
    // 创建all分类对象
    const allCategory = {
      class: 'all',
      class_name: allName,
      count: stats.totalTools,
      icon: allIcon,
      sort_order: allSortOrder,
      popular_tool: mostPopularAllTool ? {
        name: mostPopularAllTool.tool_name,
        collection_count: mostPopularAllTool.collection_count
      } : null,
      has_new_tools: allTools.some(tool => tool.is_new),
      tools: allTools
    };
    
    // 将all分类添加到classes数组最前面
    classes.push(allCategory);
  }
  
  // 添加其他分类
  classes.push(...regularClasses);

  // 构建最终结果
  const result = {
    classified: sortedClassified,
    classes: classes
  };

  // 添加统计信息
  if (includeStats) {
    result.stats = {
      ...stats,
      totalClasses: sortedClasses.length + (includeAllCategory ? 1 : 0),
      averageToolsPerClass: sortedClasses.length > 0 ? stats.totalTools / sortedClasses.length : 0,
      mostPopularCategory: getMostPopularCategory(stats.classCounts),
      categoriesWithNewTools: classes.filter(c => c.has_new_tools).map(c => c.class),
      totalCollectionCount: processedTools.reduce((sum, tool) => sum + (tool.collection_count || 0), 0)
    };
  }

  return result;
}

export { classifyToolsByClass };

/**
 * 分类缺少 icon 时的默认图标
 * @param {string} toolClass
 * @returns {string}
 */
function getDefaultIcon(toolClass) {
  const iconMap = {
    video: '🎬',
    image: '🖼️',
    dev: '💻',
    text: '📝',
    audio: '🎵',
    pdf: '📄',
    code: '⌨️',
  };
  return iconMap[toolClass] || '🔧';
}

/**
 * 取工具数量最多的分类
 * @param {Record<string, number>} classCounts
 * @returns {string|null}
 */
function getMostPopularCategory(classCounts) {
  const entries = Object.entries(classCounts || {});
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
