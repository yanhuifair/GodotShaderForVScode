// Godot Shader 内置变量、常量、矩阵和函数的数据

interface BuiltinsMap {
    [key: string]: Array<{name: string, type: string, description: string}> | undefined;
    global: Array<{name: string, type: string, description: string}>;
    vertex_input: Array<{name: string, type: string, description: string}>;
    vertex_output: Array<{name: string, type: string, description: string}>;
    vertex_matrices: Array<{name: string, type: string, description: string}>;
    vertex_bones: Array<{name: string, type: string, description: string}>;
    vertex_write: Array<{name: string, type: string, description: string}>;
    fragment_input: Array<{name: string, type: string, description: string}>;
    fragment_output: Array<{name: string, type: string, description: string}>;
    canvasitem: Array<{name: string, type: string, description: string}>;
    sky_global: Array<{name: string, type: string, description: string}>;
    sky: Array<{name: string, type: string, description: string}>;
    fog_global: Array<{name: string, type: string, description: string}>;
    fog: Array<{name: string, type: string, description: string}>;
    particles_input: Array<{name: string, type: string, description: string}>;
    particles_output: Array<{name: string, type: string, description: string}>;
    light_input: Array<{name: string, type: string, description: string}>;
    light_output: Array<{name: string, type: string, description: string}>;
}

export const GODOT_SHADER_BUILTINS: BuiltinsMap = {
    // 全局内置常量（所有着色器类型可用）
    global: [
        { name: "TIME", type: "float", description: "引擎启动后的全局时间（秒）" },
        { name: "PI", type: "float", description: "常数 π (3.141592)" },
        { name: "TAU", type: "float", description: "常数 τ (6.283185)，等于 π × 2" },
        { name: "E", type: "float", description: "欧拉数 e (2.718281)" },
        { name: "OUTPUT_IS_SRGB", type: "bool", description: "如果输出是 sRGB 则为 true（Compatibility 渲染器）" },
        { name: "CLIP_SPACE_FAR", type: "float", description: "远裁剪面值（Forward+/Mobile 为 0.0，Compatibility 为 1.0）" },
        { name: "VIEWPORT_SIZE", type: "vec2", description: "视口大小（像素）" },
        { name: "CURRENT_RENDERER", type: "int", description: "当前渲染器类型（0=Forward+，1=Mobile，2=Compatibility，3=Forward）" },
        { name: "RENDERER_FORWARD_PLUS", type: "int", description: "Forward+ 渲染器常量（值为 0）" },
        { name: "RENDERER_MOBILE", type: "int", description: "Mobile 渲染器常量（值为 1）" },
        { name: "RENDERER_COMPATIBILITY", type: "int", description: "Compatibility 渲染器常量（值为 2）" },
        { name: "RENDERER_FORWARD", type: "int", description: "Forward 渲染器常量（值为 3），Godot 4.3+" },
        { name: "IS_MULTIVIEW", type: "bool", description: "是否为立体（XR）输出（Godot 4.7+）" },
        { name: "IN_SHADOW_PASS", type: "bool", description: "是否在阴影贴图通道中渲染（Godot 4.7+），可用于阴影通道中差异化渲染" }
    ],
    
    // 顶点着色器输入变量（只读）
    vertex_input: [
        { name: "VIEWPORT_SIZE", type: "vec2", description: "视口大小（像素）" },
        { name: "VIEW_MATRIX", type: "mat4", description: "世界空间 → 视图空间" },
        { name: "INV_VIEW_MATRIX", type: "mat4", description: "视图空间 → 世界空间" },
        { name: "MAIN_CAM_INV_VIEW_MATRIX", type: "mat4", description: "主相机逆视图矩阵 / 视图空间 → 世界空间（只读）" },
        { name: "INV_PROJECTION_MATRIX", type: "mat4", description: "裁剪空间 → 视图空间" },
        { name: "NODE_POSITION_WORLD", type: "vec3", description: "节点世界坐标" },
        { name: "NODE_POSITION_VIEW", type: "vec3", description: "节点视图坐标" },
        { name: "CAMERA_POSITION_WORLD", type: "vec3", description: "相机世界坐标" },
        { name: "CAMERA_DIRECTION_WORLD", type: "vec3", description: "相机世界方向" },
        { name: "CAMERA_VISIBLE_LAYERS", type: "uint", description: "相机可见图层掩码" },
        { name: "OUTPUT_IS_SRGB", type: "bool", description: "是否 sRGB 输出" },
        { name: "INSTANCE_ID", type: "int", description: "实例 ID（实例化渲染唯一标识）" },
        { name: "INSTANCE_CUSTOM", type: "vec4", description: "实例自定义数据" },
        { name: "VIEW_INDEX", type: "int", description: "视图索引（多视图渲染）" },
        { name: "VIEW_MONO_LEFT", type: "int", description: "单目/左眼常量（0）" },
        { name: "VIEW_RIGHT", type: "int", description: "右眼常量（1）" },
        { name: "EYE_OFFSET", type: "vec3", description: "眼睛偏移 / 世界空间（多视图渲染）" },
        { name: "VERTEX_ID", type: "int", description: "顶点缓冲区中的顶点索引" },
        { name: "CUSTOM0", type: "vec4", description: "自定义顶点数据通道 0" },
        { name: "CUSTOM1", type: "vec4", description: "自定义顶点数据通道 1" },
        { name: "CUSTOM2", type: "vec4", description: "自定义顶点数据通道 2" },
        { name: "CUSTOM3", type: "vec4", description: "自定义顶点数据通道 3" }
    ],
    
    // 顶点着色器输出变量（可读写）
    vertex_output: [
        { name: "VERTEX", type: "vec3", description: "顶点位置（模型空间，读写）" },
        { name: "NORMAL", type: "vec3", description: "顶点法线（模型空间，读写）" },
        { name: "TANGENT", type: "vec3", description: "顶点切线（模型空间，读写）" },
        { name: "BINORMAL", type: "vec3", description: "顶点副切线（模型空间，读写）" },
        { name: "UV", type: "vec2", description: "第一套 UV 坐标（读写）" },
        { name: "UV2", type: "vec2", description: "第二套 UV 坐标（读写）" },
        { name: "COLOR", type: "vec4", description: "顶点颜色（读写）" },
        { name: "POINT_SIZE", type: "float", description: "点渲染大小（读写）" }
    ],
    
    // 顶点着色器内置矩阵（可读写）
    vertex_matrices: [
        { name: "MODELVIEW_MATRIX", type: "mat4", description: "模型空间 → 视图空间（读写，推荐用于避免精度问题）" },
        { name: "MODELVIEW_NORMAL_MATRIX", type: "mat3", description: "模型空间 → 视图空间（法线变换矩阵）" },
        { name: "MODEL_MATRIX", type: "mat4", description: "模型空间 → 世界空间（读写）" },
        { name: "MODEL_NORMAL_MATRIX", type: "mat3", description: "模型空间 → 世界空间（法线变换矩阵）" },
        { name: "VIEW_MATRIX", type: "mat4", description: "世界空间 → 视图空间（只读）" },
        { name: "INV_VIEW_MATRIX", type: "mat4", description: "视图空间 → 世界空间（只读）" },
        { name: "PROJECTION_MATRIX", type: "mat4", description: "视图空间 → 裁剪空间（读写）" },
        { name: "INV_PROJECTION_MATRIX", type: "mat4", description: "裁剪空间 → 视图空间（只读）" },
        { name: "MAIN_CAM_INV_VIEW_MATRIX", type: "mat4", description: "主相机逆视图矩阵 / 视图空间 → 世界空间（只读）" }
    ],
    
    // 顶点着色器骨骼数据
    vertex_bones: [
        { name: "BONE_INDICES", type: "uvec4", description: "骨骼索引（用于蒙皮）" },
        { name: "BONE_WEIGHTS", type: "vec4", description: "骨骼权重（用于蒙皮）" }
    ],
    
    // 顶点着色器输出（只写）
    vertex_write: [
        { name: "POSITION", type: "vec4", description: "覆盖最终顶点位置 / 裁剪空间（如果写入）" },
        { name: "ROUGHNESS", type: "float", description: "顶点光照粗糙度" },
        { name: "Z_CLIP_SCALE", type: "float", description: "顶点向相机方向缩放系数" }
    ],
    
    // 片段着色器输入变量（只读）
    fragment_input: [
        { name: "VIEWPORT_SIZE", type: "vec2", description: "视口大小（像素）" },
        { name: "FRAGCOORD", type: "vec4", description: "片段坐标（屏幕空间）" },
        { name: "FRONT_FACING", type: "bool", description: "是否正面朝向" },
        { name: "VIEW", type: "vec3", description: "从片段到相机的归一化向量（视图空间）" },
        { name: "UV", type: "vec2", description: "第一套 UV 坐标（从顶点传递）" },
        { name: "UV2", type: "vec2", description: "第二套 UV 坐标（从顶点传递）" },
        { name: "COLOR", type: "vec4", description: "顶点颜色（从顶点传递）" },
        { name: "POINT_COORD", type: "vec2", description: "点坐标 / 屏幕空间（用于点渲染）" },
        { name: "OUTPUT_IS_SRGB", type: "bool", description: "是否 sRGB 输出" },
        { name: "MODEL_MATRIX", type: "mat4", description: "模型空间 → 世界空间（只读）" },
        { name: "MODEL_NORMAL_MATRIX", type: "mat3", description: "模型空间 → 世界空间（法线变换矩阵，只读）" },
        { name: "VIEW_MATRIX", type: "mat4", description: "世界空间 → 视图空间（只读）" },
        { name: "INV_VIEW_MATRIX", type: "mat4", description: "视图空间 → 世界空间（只读）" },
        { name: "PROJECTION_MATRIX", type: "mat4", description: "视图空间 → 裁剪空间（只读）" },
        { name: "INV_PROJECTION_MATRIX", type: "mat4", description: "裁剪空间 → 视图空间（只读）" },
        { name: "NODE_POSITION_WORLD", type: "vec3", description: "节点世界坐标" },
        { name: "NODE_POSITION_VIEW", type: "vec3", description: "节点视图坐标" },
        { name: "CAMERA_POSITION_WORLD", type: "vec3", description: "相机世界坐标" },
        { name: "CAMERA_DIRECTION_WORLD", type: "vec3", description: "相机世界方向" },
        { name: "CAMERA_VISIBLE_LAYERS", type: "uint", description: "相机可见图层掩码" },
        { name: "VERTEX", type: "vec3", description: "顶点位置（从顶点传递，默认视图空间）" },
        { name: "LIGHT_VERTEX", type: "vec3", description: "可调整的 VERTEX 副本 / 默认视图空间（用于光照计算）" },
        { name: "VIEW_INDEX", type: "int", description: "视图索引（多视图渲染）" },
        { name: "VIEW_MONO_LEFT", type: "int", description: "单目/左眼常量（0）" },
        { name: "VIEW_RIGHT", type: "int", description: "右眼常量（1）" },
        { name: "EYE_OFFSET", type: "vec3", description: "眼睛偏移 / 世界空间（多视图渲染）" },
        { name: "SCREEN_UV", type: "vec2", description: "屏幕空间 UV 坐标" },
        { name: "DEPTH", type: "float", description: "自定义深度值 / NDC（如果写入）" }
    ],
    
    // 片段着色器输出变量（可读写）
    fragment_output: [
        { name: "NORMAL", type: "vec3", description: "法线向量 / 视图空间（读写）" },
        { name: "TANGENT", type: "vec3", description: "切线 / 视图空间（读写）" },
        { name: "BINORMAL", type: "vec3", description: "副切线 / 视图空间（读写）" },
        { name: "NORMAL_MAP", type: "vec3", description: "法线贴图向量（切线空间，写入以覆盖 NORMAL）" },
        { name: "NORMAL_MAP_DEPTH", type: "float", description: "法线贴图深度缩放因子（默认 1.0）" },
        { name: "BENT_NORMAL_MAP", type: "vec3", description: "弯曲法线贴图 / 切线空间（用于环境光遮蔽，写入以修改环境光照方向）" },
        { name: "ALBEDO", type: "vec3", description: "反照率颜色（读写）" },
        { name: "ALPHA", type: "float", description: "透明度（读写，范围 0..1）" },
        { name: "ALPHA_SCISSOR_THRESHOLD", type: "float", description: "Alpha 剪刀阈值（低于此值的片段被丢弃）" },
        { name: "ALPHA_HASH_SCALE", type: "float", description: "Alpha 哈希缩放" },
        { name: "ALPHA_ANTIALIASING_EDGE", type: "float", description: "Alpha 抗锯齿边缘" },
        { name: "ALPHA_TEXTURE_COORDINATE", type: "vec2", description: "Alpha 纹理坐标" },
        { name: "PREMUL_ALPHA_FACTOR", type: "float", description: "预乘 Alpha 系数" },
        { name: "METALLIC", type: "float", description: "金属度（读写，范围 0..1）" },
        { name: "SPECULAR", type: "float", description: "高光度（读写，默认 0.5）" },
        { name: "ROUGHNESS", type: "float", description: "粗糙度（读写，范围 0..1）" },
        { name: "RIM", type: "float", description: "边缘光照强度（范围 0..1）" },
        { name: "RIM_TINT", type: "float", description: "边缘光照色调（0=白色，1=反照率颜色）" },
        { name: "CLEARCOAT", type: "float", description: "清漆层强度" },
        { name: "CLEARCOAT_GLOSS", type: "float", description: "清漆层光泽度" },
        { name: "ANISOTROPY", type: "float", description: "各向异性高光扭曲强度" },
        { name: "ANISOTROPY_FLOW", type: "vec2", description: "各向异性高光方向（用于流图）" },
        { name: "SSS_STRENGTH", type: "float", description: "次表面散射强度" },
        { name: "SSS_TRANSMITTANCE_COLOR", type: "vec4", description: "次表面散射透射颜色" },
        { name: "SSS_TRANSMITTANCE_DEPTH", type: "float", description: "次表面散射透射深度" },
        { name: "SSS_TRANSMITTANCE_BOOST", type: "float", description: "次表面散射透射增强" },
        { name: "BACKLIGHT", type: "vec3", description: "背光颜色（由 fragment 设置，在 light 函数中只读）" },
        { name: "AO", type: "float", description: "环境光遮蔽强度" },
        { name: "AO_LIGHT_AFFECT", type: "float", description: "环境光遮蔽对实时光照的影响（0..1）" },
        { name: "EMISSION", type: "vec3", description: "自发光颜色（可超过 (1,1,1) 用于 HDR）" },
        { name: "FOG", type: "vec4", description: "雾混合（使用 FOG.rgb 和 FOG.a）" },
        { name: "RADIANCE", type: "vec4", description: "环境贴图辐射度混合" },
        { name: "IRRADIANCE", type: "vec4", description: "环境贴图辐照度混合" }
    ],
    
    // CanvasItem 着色器特有变量
    canvasitem: [
        { name: "AT_LIGHT_PASS", type: "bool", description: "是否在光照通道中（vertex 中始终为 false）" },
        { name: "CANVAS_MATRIX", type: "mat4", description: "世界空间 → 画布空间变换矩阵" },
        { name: "INSTANCE_CUSTOM", type: "vec4", description: "实例自定义数据（粒子：x=旋转, y=相位, z=动画帧）" },
        { name: "INSTANCE_ID", type: "int", description: "实例 ID（实例化渲染唯一标识）" },
        { name: "NORMAL_TEXTURE", type: "sampler2D", description: "默认法线贴图纹理" },
        { name: "POINT_COORD", type: "vec2", description: "点精灵坐标" },
        { name: "REGION_RECT", type: "vec4", description: "精灵区域可见矩形（x, y, width, height）" },
        { name: "SCREEN_MATRIX", type: "mat4", description: "画布空间 → 裁剪空间变换矩阵" },
        { name: "SCREEN_PIXEL_SIZE", type: "vec2", description: "屏幕像素大小" },
        { name: "SPECULAR_SHININESS", type: "vec4", description: "高光光泽颜色（从纹理采样）" },
        { name: "SPECULAR_SHININESS_TEXTURE", type: "sampler2D", description: "高光光泽纹理" },
        { name: "SPHERE_INDEX", type: "int", description: "球体索引（XR 多层渲染）" },
        { name: "TEXTURE", type: "sampler2D", description: "默认纹理（读写）" },
        { name: "TEXTURE_PIXEL_SIZE", type: "vec2", description: "纹理像素大小" },
        { name: "CUSTOM0", type: "vec4", description: "自定义顶点数据通道 0" },
        { name: "CUSTOM1", type: "vec4", description: "自定义顶点数据通道 1" },
        { name: "SHADOW_VERTEX", type: "vec2", description: "阴影顶点位置（写入以修改阴影）" }
    ],
    
    // Sky 着色器全局变量
    sky_global: [
        { name: "TIME", type: "float", description: "引擎启动后的全局时间（秒）" },
        { name: "POSITION", type: "vec3", description: "相机在世界空间中的位置" },
        { name: "RADIANCE", type: "samplerCube", description: "辐射度立方体贴图（仅在背景通道可读）" },
        { name: "AT_HALF_RES_PASS", type: "bool", description: "是否正在渲染半分辨率子通道" },
        { name: "AT_QUARTER_RES_PASS", type: "bool", description: "是否正在渲染四分之一分辨率子通道" },
        { name: "AT_CUBEMAP_PASS", type: "bool", description: "是否正在渲染辐射度立方体贴图" },
        { name: "LIGHT0_ENABLED", type: "bool", description: "灯光 0 是否启用" },
        { name: "LIGHT0_ENERGY", type: "float", description: "灯光 0 的能量倍增" },
        { name: "LIGHT0_DIRECTION", type: "vec3", description: "灯光 0 的朝向" },
        { name: "LIGHT0_COLOR", type: "vec3", description: "灯光 0 的颜色" },
        { name: "LIGHT0_SIZE", type: "float", description: "灯光 0 在天空中的角直径（弧度）" },
        { name: "LIGHT1_ENABLED", type: "bool", description: "灯光 1 是否启用" },
        { name: "LIGHT1_ENERGY", type: "float", description: "灯光 1 的能量倍增" },
        { name: "LIGHT1_DIRECTION", type: "vec3", description: "灯光 1 的朝向" },
        { name: "LIGHT1_COLOR", type: "vec3", description: "灯光 1 的颜色" },
        { name: "LIGHT1_SIZE", type: "float", description: "灯光 1 在天空中的角直径（弧度）" },
        { name: "LIGHT2_ENABLED", type: "bool", description: "灯光 2 是否启用" },
        { name: "LIGHT2_ENERGY", type: "float", description: "灯光 2 的能量倍增" },
        { name: "LIGHT2_DIRECTION", type: "vec3", description: "灯光 2 的朝向" },
        { name: "LIGHT2_COLOR", type: "vec3", description: "灯光 2 的颜色" },
        { name: "LIGHT2_SIZE", type: "float", description: "灯光 2 在天空中的角直径（弧度）" },
        { name: "LIGHT3_ENABLED", type: "bool", description: "灯光 3 是否启用" },
        { name: "LIGHT3_ENERGY", type: "float", description: "灯光 3 的能量倍增" },
        { name: "LIGHT3_DIRECTION", type: "vec3", description: "灯光 3 的朝向" },
        { name: "LIGHT3_COLOR", type: "vec3", description: "灯光 3 的颜色" },
        { name: "LIGHT3_SIZE", type: "float", description: "灯光 3 在天空中的角直径（弧度）" },
        { name: "PI", type: "float", description: "常数 π (3.141592)" },
        { name: "TAU", type: "float", description: "常数 τ (6.283185)" },
        { name: "E", type: "float", description: "欧拉数 e (2.718281)" }
    ],
    
    // Sky 着色器特有变量（sky() 函数内可用）
    sky: [
        { name: "EYEDIR", type: "vec3", description: "当前像素的归一化方向 / 世界空间（用于程序化天空效果）" },
        { name: "SCREEN_UV", type: "vec2", description: "当前像素的屏幕 UV 坐标" },
        { name: "SKY_COORDS", type: "vec2", description: "球面 UV 坐标（用于全景纹理）" },
        { name: "HALF_RES_COLOR", type: "vec4", description: "半分辨率子通道对应像素的颜色值" },
        { name: "QUARTER_RES_COLOR", type: "vec4", description: "四分之一分辨率子通道对应像素的颜色值" },
        { name: "COLOR", type: "vec3", description: "当前像素的输出颜色" },
        { name: "ALPHA", type: "float", description: "当前像素的输出 Alpha 值（仅子通道有效）" },
        { name: "FOG", type: "vec4", description: "雾混合（使用 FOG.rgb 和 FOG.a）" }
    ],
    
    // Fog 着色器全局变量
    fog_global: [
        { name: "TIME", type: "float", description: "引擎启动后的全局时间（秒）" },
        { name: "PI", type: "float", description: "常数 π (3.141592)" },
        { name: "TAU", type: "float", description: "常数 τ (6.283185)" },
        { name: "E", type: "float", description: "欧拉数 e (2.718281)" }
    ],
    
    // Fog 着色器特有变量（fog() 函数内可用）
    fog: [
        { name: "WORLD_POSITION", type: "vec3", description: "当前 froxel 在世界空间中的位置" },
        { name: "OBJECT_POSITION", type: "vec3", description: "关联的 FogVolume 中心在世界空间中的位置" },
        { name: "UVW", type: "vec3", description: "3D UV 坐标（用于 3D 纹理映射）" },
        { name: "SIZE", type: "vec3", description: "FogVolume 的尺寸" },
        { name: "SDF", type: "float", description: "到 FogVolume 表面的有符号距离场（负值=内部，正值=外部）" },
        { name: "ALBEDO", type: "vec3", description: "雾的基础颜色（与场景光照交互）" },
        { name: "DENSITY", type: "float", description: "雾的密度（必须设置才会输出内容）" },
        { name: "EMISSION", type: "vec3", description: "雾的自发光颜色" }
    ],
    
    // Particles 着色器特有变量（输入）
    particles_input: [
        { name: "PARTICLE_INDEX", type: "uint", description: "粒子索引" },
        { name: "PARTICLE_LIFETIME", type: "float", description: "粒子生命周期（归一化）" },
        { name: "PARTICLE_START_LIFETIME", type: "float", description: "粒子起始生命周期" },
        { name: "PARTICLE_POSITION", type: "vec3", description: "粒子位置（模型空间）" },
        { name: "PARTICLE_VELOCITY", type: "vec3", description: "粒子速度（模型空间/秒）" },
        { name: "PARTICLE_COLOR", type: "vec4", description: "粒子颜色" },
        { name: "PARTICLE_CUSTOM", type: "vec4", description: "粒子自定义数据" },
        { name: "PARTICLE_FLAG_ALIVE", type: "float", description: "粒子存活标志" },
        { name: "PARTICLE_FLAG_DEAD", type: "float", description: "粒子死亡标志" },
        { name: "PARTICLE_FLAG_CUSTOM", type: "float", description: "粒子自定义标志" },
        { name: "PARTICLE_GLOBAL_AABB", type: "vec4", description: "粒子全局 AABB" },
        { name: "EMISSION_TRANSFORM", type: "mat4", description: "发射变换矩阵（模型空间 → 世界空间）" }
    ],
    
    // Particles 着色器特有变量（输出）
    particles_output: [
        { name: "COLOR", type: "vec4", description: "粒子颜色（读写）" },
        { name: "VELOCITY", type: "vec3", description: "粒子速度（读写）" },
        { name: "MASS", type: "float", description: "粒子质量（读写）" },
        { name: "ACTIVE", type: "bool", description: "粒子是否活跃（读写）" },
        { name: "RESTART", type: "bool", description: "粒子是否重新启动（读写）" },
        { name: "CUSTOM", type: "vec4", description: "自定义粒子数据（读写）" },
        { name: "TRANSFORM", type: "mat4", description: "粒子变换矩阵（读写）" },
        { name: "LIFETIME", type: "float", description: "粒子生命周期" }
    ],
    
    // 光源内置变量（仅在 light 函数中可用 - 输入）
    light_input: [
        { name: "ALBEDO", type: "vec3", description: "基础反照率颜色（只读）" },
        { name: "ATTENUATION", type: "float", description: "光照衰减（读写）" },
        { name: "BACKLIGHT", type: "vec3", description: "背光颜色（只读，由 fragment 设置）" },
        { name: "LIGHT", type: "vec3", description: "光照方向向量 / 视图空间（只读）" },
        { name: "LIGHT_COLOR", type: "vec3", description: "光源颜色（只读）" },
        { name: "LIGHT_DIRECTION", type: "vec3", description: "光照方向（只读）" },
        { name: "LIGHT_ENERGY", type: "float", description: "光源能量倍增值 / 仅 CanvasItem（只读）" },
        { name: "LIGHT_IS_DIRECTIONAL", type: "bool", description: "当前灯光是否为方向光" },
        { name: "LIGHT_POSITION", type: "vec3", description: "光源位置 / 屏幕空间（仅 CanvasItem）" },
        { name: "LIGHT_VERTEX", type: "vec3", description: "光照顶点位置（只读）" },
        { name: "METALLIC", type: "float", description: "金属度（只读）" },
        { name: "NORMAL", type: "vec3", description: "法线向量 / 视图空间（只读）" },
        { name: "ROUGHNESS", type: "float", description: "粗糙度（只读）" },
        { name: "SCREEN_UV", type: "vec2", description: "屏幕空间 UV 坐标（只读）" },
        { name: "SPECULAR_AMOUNT", type: "float", description: "高光系数（全向光/聚光灯为 2.0，方向光为 1.0）" },
        { name: "UV", type: "vec2", description: "第一套 UV 坐标（只读）" },
        { name: "UV2", type: "vec2", description: "第二套 UV 坐标（只读）" },
        { name: "VIEW", type: "vec3", description: "从片段到相机的归一化向量 / 视图空间（只读）" }
    ],
    
    // 光源内置变量（输出，spatial light() 中可写）
    light_output: [
        { name: "ALPHA", type: "float", description: "透明度（写入后材质进入透明管道）" },
        { name: "ATTENUATION", type: "float", description: "光照衰减（读写）" },
        { name: "DIFFUSE_LIGHT", type: "vec3", description: "漫反射光照结果（累加，使用 +=）" },
        { name: "SPECULAR_LIGHT", type: "vec3", description: "镜面反射光照结果（累加，使用 +=）" }
    ]
};

export const GODOT_SHADER_FUNCTIONS = [
    // 纹理函数
    { name: "texture", signature: "texture(sampler2D tex, vec2 uv)", description: "采样 2D 纹理" },
    { name: "textureLod", signature: "textureLod(sampler2D tex, vec2 uv, float lod)", description: "采样纹理（指定 LOD）" },
    { name: "textureProj", signature: "textureProj(sampler2D tex, vec3 uv)", description: "投影纹理采样" },
    { name: "textureGrad", signature: "textureGrad(sampler2D tex, vec2 uv, vec2 dx, vec2 dy)", description: "使用梯度采样纹理" },
    { name: "textureCube", signature: "textureCube(samplerCube tex, vec3 uvw)", description: "采样立方体纹理" },
    { name: "textureCubeLod", signature: "textureCubeLod(samplerCube tex, vec3 uvw, float lod)", description: "采样立方体纹理（指定 LOD）" },
    { name: "textureArray", signature: "textureArray(sampler2DArray tex, vec3 uvw)", description: "采样 2D 纹理数组" },
    
    // 数学函数 - 插值
    { name: "mix", signature: "mix(vecX a, vecX b, float|vecX t)", description: "线性插值。支持两种模式: mix(a, b, float t) 标量混合, mix(a, b, vecX t) 逐分量混合" },
    { name: "clamp", signature: "clamp(vecX x, vecX|float min, vecX|float max)", description: "钳制数值到 [min, max] 范围。支持 vecX 和 float 参数" },
    { name: "step", signature: "step(float|vecX edge, float|vecX x)", description: "阶跃函数（x < edge 返回 0，否则返回 1）。支持 float 和 vecX 参数" },
    { name: "smoothstep", signature: "smoothstep(float edge0, float edge1, float|vecX x)", description: "平滑阶跃函数（Hermite 插值）。支持 float 和 vecX 参数" },
    
    // 数学函数 - 三角函数
    { name: "sin", signature: "sin(float x)", description: "正弦函数（x 为弧度）" },
    { name: "cos", signature: "cos(float x)", description: "余弦函数（x 为弧度）" },
    { name: "tan", signature: "tan(float x)", description: "正切函数（x 为弧度）" },
    { name: "asin", signature: "asin(float x)", description: "反正弦函数（返回 [-π/2, π/2]）" },
    { name: "acos", signature: "acos(float x)", description: "反余弦函数（返回 [0, π]）" },
    { name: "atan", signature: "atan(float y, float x)", description: "反正切函数，支持单参数和双参数（atan(y/x) 或 atan(y, x)）" },
    
    // 数学函数 - 双曲函数
    { name: "sinh", signature: "sinh(float x)", description: "双曲正弦函数" },
    { name: "cosh", signature: "cosh(float x)", description: "双曲余弦函数" },
    { name: "tanh", signature: "tanh(float x)", description: "双曲正切函数" },
    { name: "asinh", signature: "asinh(float x)", description: "反双曲正弦函数" },
    { name: "acosh", signature: "acosh(float x)", description: "反双曲余弦函数" },
    { name: "atanh", signature: "atanh(float x)", description: "反双曲正切函数" },
    
    // 数学函数 - 幂和对数
    { name: "pow", signature: "pow(float x, float y)", description: "x 的 y 次幂" },
    { name: "sqrt", signature: "sqrt(float x)", description: "平方根" },
    { name: "inversesqrt", signature: "inversesqrt(float x)", description: "平方根的倒数（1/√x）" },
    { name: "exp", signature: "exp(float x)", description: "e 的 x 次幂" },
    { name: "exp2", signature: "exp2(float x)", description: "2 的 x 次幂" },
    { name: "log", signature: "log(float x)", description: "自然对数（以 e 为底）" },
    { name: "log2", signature: "log2(float x)", description: "以 2 为底的对数" },
    
    // 向量函数 - 长度和距离
    { name: "length", signature: "length(vecX x)", description: "向量长度（√(x₀² + x₁² + ...)）" },
    { name: "distance", signature: "distance(vecX a, vecX b)", description: "两点间距离（length(a - b)）" },
    { name: "dot", signature: "dot(vecX a, vecX b)", description: "点积（a₀b₀ + a₁b₁ + ...）" },
    { name: "cross", signature: "cross(vec3 a, vec3 b)", description: "叉积（返回垂直于 a 和 b 的向量）" },
    { name: "normalize", signature: "normalize(vecX x)", description: "归一化向量（x / length(x)）" },
    { name: "reflect", signature: "reflect(vecX I, vecX N)", description: "反射向量（I - 2.0 * dot(N, I) * N）" },
    { name: "refract", signature: "refract(vecX I, vecX N, float eta)", description: "折射向量（根据折射率 eta）" },
    { name: "faceforward", signature: "faceforward(vecX N, vecX I, vecX Nref)", description: "面向前的法线（dot(Nref, I) < 0 ? N : -N）" },
    
    // 向量函数 - 分量操作
    { name: "abs", signature: "abs(float x)", description: "绝对值" },
    { name: "sign", signature: "sign(float x)", description: "符号函数（x > 0 返回 1，x < 0 返回 -1，否则返回 0）" },
    { name: "floor", signature: "floor(float x)", description: "向下取整（≤ x 的最大整数）" },
    { name: "ceil", signature: "ceil(float x)", description: "向上取整（≥ x 的最小整数）" },
    { name: "round", signature: "round(float x)", description: "四舍五入" },
    { name: "trunc", signature: "trunc(float x)", description: "截断小数部分（向零取整）" },
    { name: "fract", signature: "fract(float x)", description: "小数部分（x - floor(x)）" },
    { name: "mod", signature: "mod(float x, float y)", description: "取模（x - y * floor(x/y)）" },
    { name: "min", signature: "min(vecX a, vecX b)", description: "最小值" },
    { name: "max", signature: "max(vecX a, vecX b)", description: "最大值" },

    // 矩阵函数
    { name: "determinant", signature: "determinant(matX m)", description: "矩阵行列式" },
    { name: "transpose", signature: "transpose(matX m)", description: "矩阵转置" },
    { name: "inverse", signature: "inverse(matX m)", description: "矩阵求逆" },
    { name: "outerProduct", signature: "outerProduct(vecX a, vecY b)", description: "外积（返回 matX 矩阵）" },
    
    // 构造函数（支持多重重载形式，Godot 4 不允许从高维截断）
    { name: "vec2", signature: "vec2(float) | vec2(float, float)", description: "创建 2 分量向量" },
    { name: "vec3", signature: "vec3(float) | vec3(float, float, float) | vec3(vec2, float) | vec3(float, vec2)", description: "创建 3 分量向量" },
    { name: "vec4", signature: "vec4(float) | vec4(float, float, float, float) | vec4(vec2, float, float) | vec4(vec3, float) | vec4(float, vec3)", description: "创建 4 分量向量" },
    { name: "mat2", signature: "mat2(float) | mat2(vec2, vec2)", description: "创建 2x2 矩阵" },
    { name: "mat3", signature: "mat3(float) | mat3(vec3, vec3, vec3)", description: "创建 3x3 矩阵" },
    { name: "mat4", signature: "mat4(float) | mat4(vec4, vec4, vec4, vec4)", description: "创建 4x4 矩阵" },
    { name: "bool", signature: "bool(int|uint|float|bool x)", description: "转换为布尔值。非零为 true，零为 false" },
    { name: "int", signature: "int(float|uint|bool x)", description: "转换为有符号整数。浮点数截断，布尔值 true->1 / false->0" },
    { name: "uint", signature: "uint(int|float|bool x)", description: "转换为无符号整数。浮点数截断，布尔值 true->1 / false->0" },
    { name: "float", signature: "float(int|uint|bool x)", description: "转换为浮点数。布尔值 true->1.0 / false->0.0" },
    
    // 角度/弧度转换
    { name: "radians", signature: "radians(float degrees)", description: "角度转弧度" },
    { name: "degrees", signature: "degrees(float radians)", description: "弧度转角度" },
    
    // 导数函数（仅在 fragment/light 函数中可用）
    { name: "dFdx", signature: "dFdx(vecX p)", description: "屏幕空间 x 方向偏导数。仅在 fragment() 和 light() 中可用" },
    { name: "dFdy", signature: "dFdy(vecX p)", description: "屏幕空间 y 方向偏导数。仅在 fragment() 和 light() 中可用" },
    { name: "fwidth", signature: "fwidth(vecX p)", description: "偏导数绝对值之和：abs(dFdx(p)) + abs(dFdy(p))。用于估算变化率" },
    { name: "dFdxCoarse", signature: "dFdxCoarse(vecX p)", description: "x 方向粗粒度偏导数（仅 fragment/light，Compatibility 不可用）" },
    { name: "dFdxFine", signature: "dFdxFine(vecX p)", description: "x 方向细粒度偏导数（仅 fragment/light，Compatibility 不可用）" },
    { name: "dFdyCoarse", signature: "dFdyCoarse(vecX p)", description: "y 方向粗粒度偏导数（仅 fragment/light，Compatibility 不可用）" },
    { name: "dFdyFine", signature: "dFdyFine(vecX p)", description: "y 方向细粒度偏导数（仅 fragment/light，Compatibility 不可用）" },
    { name: "fwidthCoarse", signature: "fwidthCoarse(vecX p)", description: "粗粒度偏导绝对值之和（仅 fragment/light，Compatibility 不可用）" },
    { name: "fwidthFine", signature: "fwidthFine(vecX p)", description: "细粒度偏导绝对值之和（仅 fragment/light，Compatibility 不可用）" },
    
    // 浮点数和整数位操作
    { name: "floatBitsToInt", signature: "ivecX floatBitsToInt(vecX x)", description: "浮点数位模式转有符号整数（不进行数值转换）" },
    { name: "floatBitsToUint", signature: "uvecX floatBitsToUint(vecX x)", description: "浮点数位模式转无符号整数（不进行数值转换）" },
    { name: "intBitsToFloat", signature: "vecX intBitsToFloat(ivecX x)", description: "有符号整数位模式转浮点数（不进行数值转换）" },
    { name: "uintBitsToFloat", signature: "vecX uintBitsToFloat(uvecX x)", description: "无符号整数位模式转浮点数（不进行数值转换）" },
    
    // NaN/Inf 检测
    { name: "isnan", signature: "bvecX isnan(vecX x)", description: "逐分量检测是否为 NaN" },
    { name: "isinf", signature: "bvecX isinf(vecX x)", description: "逐分量检测是否为无穷大" },
    
    // 数值分离与构造
    { name: "modf", signature: "vecX modf(vecX x, out vecX i)", description: "分离浮点数为整数部分(i)和小数部分（返回值）" },
    { name: "fma", signature: "vecX fma(vecX a, vecX b, vecX c)", description: "融合乘加：a * b + c（单次舍入，精度更高）" },
    { name: "roundEven", signature: "roundEven(vecX x)", description: "四舍五入到最近偶数整数" },
    { name: "ldexp", signature: "vecX ldexp(vecX x, out ivecX exp)", description: "组合浮点数：x * 2^exp" },
    { name: "frexp", signature: "vecX frexp(vecX x, out ivecX exp)", description: "分解浮点数为尾数（返回值，[0.5, 1.0)）和指数(exp)" },
    
    // 比较函数（逐分量）
    { name: "lessThan", signature: "bvecX lessThan(vecX x, vecX y)", description: "逐分量比较 x < y" },
    { name: "greaterThan", signature: "bvecX greaterThan(vecX x, vecX y)", description: "逐分量比较 x > y" },
    { name: "lessThanEqual", signature: "bvecX lessThanEqual(vecX x, vecX y)", description: "逐分量比较 x <= y" },
    { name: "greaterThanEqual", signature: "bvecX greaterThanEqual(vecX x, vecX y)", description: "逐分量比较 x >= y" },
    { name: "equal", signature: "bvecX equal(vecX x, vecX y)", description: "逐分量比较 x == y" },
    { name: "notEqual", signature: "bvecX notEqual(vecX x, vecX y)", description: "逐分量比较 x != y" },
    { name: "any", signature: "bool any(bvecX x)", description: "任意分量为 true 则返回 true" },
    { name: "all", signature: "bool all(bvecX x)", description: "全部分量为 true 才返回 true" },
    { name: "not", signature: "bvecX not(bvecX x)", description: "逐分量逻辑取反" },
    
    // 矩阵逐分量乘法
    { name: "matrixCompMult", signature: "matX matrixCompMult(matX x, matX y)", description: "矩阵逐分量乘法（非代数乘法）" },
    
    // 位域操作
    { name: "bitfieldExtract", signature: "intX bitfieldExtract(intX value, int offset, int bits)", description: "提取整数中的位域 [offset, offset+bits-1]" },
    { name: "bitfieldInsert", signature: "intX bitfieldInsert(intX base, intX insert, int offset, int bits)", description: "将 insert 的低 bits 位插入 base 的 [offset] 位置" },
    { name: "bitfieldReverse", signature: "intX bitfieldReverse(intX value)", description: "反转整数的位顺序" },
    { name: "bitCount", signature: "intX bitCount(intX value)", description: "统计整数中 1 位的个数" },
    { name: "findLSB", signature: "intX findLSB(intX value)", description: "查找最低有效 1 位的索引（value=0 返回 -1）" },
    { name: "findMSB", signature: "intX findMSB(intX value)", description: "查找最高有效 1 位的索引（value=0 或 -1 返回 -1）" },
    
    // 整数扩展运算
    { name: "imulExtended", signature: "void imulExtended(intX x, intX y, out intX msb, out intX lsb)", description: "32位有符号乘法产生64位结果（msb高32位, lsb低32位）" },
    { name: "umulExtended", signature: "void umulExtended(uintX x, uintX y, out uintX msb, out uintX lsb)", description: "32位无符号乘法产生64位结果（msb高32位, lsb低32位）" },
    { name: "uaddCarry", signature: "uintX uaddCarry(uintX x, uintX y, out uintX carry)", description: "无符号加法并生成进位" },
    { name: "usubBorrow", signature: "uintX usubBorrow(uintX x, uintX y, out uintX borrow)", description: "无符号减法并生成借位" },
    
    // 打包/解包函数
    { name: "packHalf2x16", signature: "uint packHalf2x16(vec2 v)", description: "将两个 float 打包为 16 位半精度浮点并存入 uint" },
    { name: "unpackHalf2x16", signature: "vec2 unpackHalf2x16(uint v)", description: "从 uint 解包两个 16 位半精度浮点为 vec2" },
    { name: "packUnorm2x16", signature: "uint packUnorm2x16(vec2 v)", description: "将两个 [0,1] 浮点数打包为 16 位无符号归一化整数" },
    { name: "unpackUnorm2x16", signature: "vec2 unpackUnorm2x16(uint v)", description: "解包两个 16 位无符号归一化整数为 [0,1] 浮点数" },
    { name: "packSnorm2x16", signature: "uint packSnorm2x16(vec2 v)", description: "将两个 [-1,1] 浮点数打包为 16 位有符号归一化整数" },
    { name: "unpackSnorm2x16", signature: "vec2 unpackSnorm2x16(uint v)", description: "解包两个 16 位有符号归一化整数为 [-1,1] 浮点数" },
    { name: "packUnorm4x8", signature: "uint packUnorm4x8(vec4 v)", description: "将四个 [0,1] 浮点数打包为 8 位无符号归一化整数" },
    { name: "unpackUnorm4x8", signature: "vec4 unpackUnorm4x8(uint v)", description: "解包四个 8 位无符号归一化整数为 [0,1] 浮点数" },
    { name: "packSnorm4x8", signature: "uint packSnorm4x8(vec4 v)", description: "将四个 [-1,1] 浮点数打包为 8 位有符号归一化整数" },
    { name: "unpackSnorm4x8", signature: "vec4 unpackSnorm4x8(uint v)", description: "解包四个 8 位有符号归一化整数为 [-1,1] 浮点数" },
    
    // 纹理函数补充
    { name: "textureSize", signature: "ivecN textureSize(samplerX s, int lod)", description: "获取纹理指定 LOD 级别的尺寸" },
    { name: "textureQueryLod", signature: "vec2 textureQueryLod(sampler2D s, vec2 p)", description: "查询纹理采样将使用的 LOD（仅 fragment）" },
    { name: "textureQueryLevels", signature: "int textureQueryLevels(sampler2D s)", description: "查询纹理可访问的 mipmap 级别数" },
    { name: "textureProjLod", signature: "vec4 textureProjLod(sampler2D s, vec3 p, float lod)", description: "投影纹理采样（指定 LOD）" },
    { name: "textureProjGrad", signature: "vec4 textureProjGrad(sampler2D s, vec3 p, vec2 dPdx, vec2 dPdy)", description: "投影纹理采样（指定梯度）" },
    { name: "texelFetch", signature: "vec4 texelFetch(sampler2D s, ivec2 p, int lod)", description: "使用整数坐标获取单个纹素（指定 LOD）" },
    { name: "textureGather", signature: "vec4 textureGather(sampler2D s, vec2 p[, int comps])", description: "收集四个纹素（用于双线性过滤的自定义实现）" }
];

export const GODOT_SHADER_TYPES = [
    "float", "int", "uint", "bool",
    "vec2", "vec3", "vec4",
    "ivec2", "ivec3", "ivec4",
    "uvec2", "uvec3", "uvec4",
    "bvec2", "bvec3", "bvec4",
    "mat2", "mat3", "mat4",
    "sampler2D", "sampler2DArray", "samplerCube", "samplerExternalOES"
];

export const GODOT_SHADER_KEYWORDS = [
    "shader_type", "render_mode", "stencil_mode",
    "uniform", "varying", "const", "struct", "void",
    "if", "else", "for", "while", "do",
    "return", "break", "continue",
    "switch", "case", "default",
    "discard", "in", "out", "inout"
];

// 关键字描述（单一数据源，供 hover 和 completion 共用）
export const GODOT_SHADER_KEYWORD_INFO: {[key: string]: {category: string, desc: string}} = {
    'shader_type': { category: 'Declaration', desc: '声明着色器类型。必须为文件中的第一行。格式: shader_type type;' },
    'render_mode': { category: 'Declaration', desc: '设置渲染模式选项。可控制混合模式、剔除、光照等。' },
    'stencil_mode': { category: 'Declaration', desc: '设置模板缓冲区操作模式（实验性，仅 spatial）。格式: stencil_mode operation, compare, ref_value;' },
    'uniform': { category: 'Declaration', desc: '声明外部可调参数。可以在检查器中编辑。' },
    'varying': { category: 'Declaration', desc: '在 vertex() 和 fragment() 函数之间传递数据。' },
    'const': { category: 'Qualifier', desc: '常量声明。该值在编译时确定，不可修改。用于定义固定参数。' },
    'struct': { category: 'Declaration', desc: '声明结构体类型。用于组合多个相关变量。' },
    'void': { category: 'Basic', desc: '无返回值。用于声明不返回值的函数。' },
    'in': { category: 'Qualifier', desc: '输入参数或输入变量声明。标识该变量从上一阶段传入。' },
    'out': { category: 'Qualifier', desc: '输出参数或输出变量声明。标识该变量传递到下一阶段。' },
    'inout': { category: 'Qualifier', desc: '输入输出参数。既可从外部读取，也可写入后传出。用于函数参数。' },
    'if': { category: 'Control Flow', desc: '条件分支语句。根据条件执行不同代码块。' },
    'else': { category: 'Control Flow', desc: '与 if 配合使用，条件为假时执行的代码块。' },
    'for': { category: 'Loop', desc: 'for 循环。用于已知迭代次数的循环。格式: for (初始化; 条件; 增量)' },
    'while': { category: 'Loop', desc: 'while 循环。在条件为真时重复执行代码块。' },
    'do': { category: 'Loop', desc: 'do-while 循环。先执行一次再判断条件。' },
    'return': { category: 'Control Flow', desc: '从函数中返回一个值。' },
    'break': { category: 'Control Flow', desc: '跳出当前循环或 switch 块。' },
    'continue': { category: 'Control Flow', desc: '跳过当前循环的剩余部分，进入下一次迭代。' },
    'switch': { category: 'Control Flow', desc: '多分支选择语句。根据表达式的值匹配对应的 case 分支。' },
    'case': { category: 'Control Flow', desc: 'switch 语句中的一个分支。后跟常量值和冒号。' },
    'default': { category: 'Control Flow', desc: 'switch 语句中的默认分支。当没有 case 匹配时执行。' },
    'discard': { category: 'Control Flow', desc: '丢弃当前片段，不进行后续处理和输出。只能在 fragment() 中使用。' },
    'vertex': { category: 'Shader Function', desc: '顶点着色器函数。用于修改顶点位置、法线和 UV 等属性。' },
    'fragment': { category: 'Shader Function', desc: '片段着色器函数。用于计算每个像素的最终颜色。' },
    'light': { category: 'Shader Function', desc: '光照着色器函数。用于自定义光照计算（仅 spatial）。' },
    'sky': { category: 'Shader Function', desc: '天空着色器函数。用于渲染程序化天空。' },
    'fog': { category: 'Shader Function', desc: '雾效着色器函数。用于自定义体积雾效果。' }
};

export const GODOT_SHADER_HINTS = [
    // Color (vec3/vec4/sampler2D)
    "source_color",
    // Texture defaults
    "hint_default_white", "hint_default_black", "hint_default_transparent",
    // Texture type
    "hint_normal", "hint_depth_texture", "hint_screen_texture",
    "hint_anisotropy", "hint_normal_roughness_texture",
    // Roughness limiter
    "hint_roughness_r", "hint_roughness_g", "hint_roughness_b",
    "hint_roughness_a", "hint_roughness_normal", "hint_roughness_gray",
    // Value range
    "hint_range", "hint_enum",
    // String
    "hint_multiline_text", "hint_file", "hint_dir",
    // Filter
    "filter_nearest", "filter_linear",
    "filter_nearest_mipmap", "filter_linear_mipmap",
    // Repeat
    "repeat_enable", "repeat_disable",
    // Instance
    "instance_index"
];

// ============================================================================
// 共享描述数据（单个数据源，消除多副本）
// ============================================================================

// 各 shader_type 有效的 render_mode 选项（字母序：canvas_item → fog → particles → sky → spatial）
export const GODOT_SHADER_RENDER_MODES: {[key: string]: string[]} = {
    'canvas_item': [
        'blend_mix', 'blend_add', 'blend_sub', 'blend_mul', 'blend_premul_alpha',
        'depth_draw_never', 'depth_draw_always', 'depth_draw_alpha_prepass',
        'cull_disabled', 'cull_front', 'cull_back',
        'light_disabled', 'light_enabled',
        'shadows_disabled', 'shadows_enabled',
        'ambient_light_disabled', 'ambient_light_enabled',
        'skip_vertex_transform',
        'do_not_delay_visibility'
    ],
    'fog': [],
    'particles': [
        'blend_mix', 'blend_add', 'blend_sub', 'blend_mul', 'blend_premul_alpha',
        'depth_draw_never', 'depth_draw_always', 'depth_draw_opaque',
        'cull_disabled', 'cull_front', 'cull_back',
        'particle_collisions_disabled', 'particle_collisions_enabled'
    ],
    'sky': ['use_half_res_pass', 'use_quarter_res_pass', 'disable_fog'],
    'spatial': [
        'blend_mix', 'blend_add', 'blend_sub', 'blend_mul', 'blend_premul_alpha',
        'depth_draw_opaque', 'depth_draw_always', 'depth_draw_never', 'depth_prepass_alpha',
        'depth_test_disabled', 'depth_test_default', 'depth_test_inverted',
        'cull_disabled', 'cull_front', 'cull_back',
        'unshaded', 'vertex_lighting',
        'shadows_disabled', 'ambient_light_disabled', 'shadow_to_opacity', 'fog_disabled',
        'diffuse_burley', 'diffuse_lambert', 'diffuse_lambert_wrap', 'diffuse_toon',
        'specular_schlick_ggx', 'specular_toon', 'specular_disabled',
        'skip_vertex_transform', 'world_vertex_coords', 'ensure_correct_normals',
        'sss_mode_skin', 'particle_trails',
        'alpha_to_coverage', 'alpha_to_coverage_and_one',
        'wireframe', 'debug_shadow_splits'
    ]
};

// render_mode 详细描述（单一数据源）
export const GODOT_SHADER_RENDER_MODE_DESCRIPTIONS: {[key: string]: {desc: string, detail: string}} = {
    // 混合模式
    'blend_mix': { desc: '混合模式（透明度即 Alpha），默认模式', detail: 'Blend Mode' },
    'blend_add': { desc: '加法混合模式', detail: 'Blend Mode' },
    'blend_sub': { desc: '减法混合模式', detail: 'Blend Mode' },
    'blend_mul': { desc: '乘法混合模式', detail: 'Blend Mode' },
    'blend_premul_alpha': { desc: '预乘 Alpha 混合模式（全透明=加法，全不透明=混合）', detail: 'Blend Mode' },
    // 深度
    'depth_draw_never': { desc: '从不绘制深度', detail: 'Depth' },
    'depth_draw_always': { desc: '始终绘制深度（不透明和透明）', detail: 'Depth' },
    'depth_draw_opaque': { desc: '仅绘制不透明几何体的深度', detail: 'Depth' },
    'depth_draw_alpha_prepass': { desc: '对透明几何体执行不透明深度预通道', detail: 'Depth' },
    'depth_prepass_alpha': { desc: '对透明几何体执行不透明深度预通道', detail: 'Depth' },
    'depth_test_disabled': { desc: '禁用深度测试', detail: 'Depth' },
    'depth_test_default': { desc: '深度测试：如果像素在其他像素后面则丢弃', detail: 'Depth' },
    'depth_test_inverted': { desc: '反转深度测试：如果像素在其他像素前面则丢弃，适用于模板效果', detail: 'Depth' },
    // 剔除
    'cull_disabled': { desc: '禁用剔除（双面渲染）', detail: 'Culling' },
    'cull_front': { desc: '剔除正面', detail: 'Culling' },
    'cull_back': { desc: '剔除背面（默认）', detail: 'Culling' },
    // 光照
    'unshaded': { desc: '仅显示反照率，不进行光照/着色计算，渲染更快', detail: 'Shading' },
    'vertex_lighting': { desc: '使用顶点光照而非逐像素光照', detail: 'Shading' },
    'light_disabled': { desc: '禁用光照', detail: 'Shading' },
    'light_enabled': { desc: '启用光照', detail: 'Shading' },
    'shadows_disabled': { desc: '禁用着色器中的阴影计算（不接收阴影，但仍可投射阴影）', detail: 'Shadows' },
    'shadows_enabled': { desc: '启用阴影', detail: 'Shadows' },
    'ambient_light_disabled': { desc: '禁用环境光和辐射度贴图的贡献', detail: 'Lighting' },
    'ambient_light_enabled': { desc: '启用环境光', detail: 'Lighting' },
    'shadow_to_opacity': { desc: '光照修改 Alpha，使阴影区域不透明，非阴影区域透明（用于 AR 叠加阴影到相机画面）', detail: 'Shadows' },
    'fog_disabled': { desc: '禁用接收基于深度的雾效或体积雾（适用于粒子等 blend_add 材质）', detail: 'Fog' },
    // 漫反射
    'diffuse_burley': { desc: 'Burley (Disney PBS) 漫反射模型（默认）', detail: 'Diffuse Model' },
    'diffuse_lambert': { desc: 'Lambert 漫反射模型', detail: 'Diffuse Model' },
    'diffuse_lambert_wrap': { desc: 'Lambert-wrap 漫反射模型（与粗糙度相关）', detail: 'Diffuse Model' },
    'diffuse_toon': { desc: 'Toon 漫反射模型', detail: 'Diffuse Model' },
    // 高光
    'specular_schlick_ggx': { desc: 'Schlick-GGX 直接光高光波瓣（默认）', detail: 'Specular Model' },
    'specular_toon': { desc: 'Toon 直接光高光波瓣', detail: 'Specular Model' },
    'specular_disabled': { desc: '禁用直接光高光波瓣（不影响反射光）', detail: 'Specular Model' },
    // 顶点变换
    'skip_vertex_transform': { desc: 'VERTEX、NORMAL、TANGENT 和 BITANGENT 需要在 vertex() 中手动变换', detail: 'Vertex Transform' },
    'world_vertex_coords': { desc: 'VERTEX、NORMAL、TANGENT 和 BITANGENT 在世界空间中修改，而非模型空间', detail: 'Vertex Transform' },
    'ensure_correct_normals': { desc: '当对非均匀缩放的网格应用时使用（当前未实现）', detail: 'Vertex Transform' },
    // 粒子
    'particle_trails': { desc: '在粒子几何体上使用时启用轨迹', detail: 'Particles' },
    'particle_collisions_disabled': { desc: '禁用粒子碰撞', detail: 'Particles' },
    'particle_collisions_enabled': { desc: '启用粒子碰撞', detail: 'Particles' },
    // Alpha
    'alpha_to_coverage': { desc: 'Alpha 抗锯齿模式', detail: 'Alpha' },
    'alpha_to_coverage_and_one': { desc: 'Alpha 抗锯齿模式（变体）', detail: 'Alpha' },
    // SSS
    'sss_mode_skin': { desc: '次表面散射皮肤模式（优化人类皮肤视觉效果，增强红色通道）', detail: 'SSS Mode' },
    // Sky
    'use_half_res_pass': { desc: '使用半分辨率通道渲染天空（性能优化）', detail: 'Sky' },
    'use_quarter_res_pass': { desc: '使用四分之一分辨率通道渲染天空（性能优化）', detail: 'Sky' },
    'disable_fog': { desc: '禁用雾效对天空的影响', detail: 'Sky' },
    // 调试
    'wireframe': { desc: '使用线条绘制几何体（用于故障排除）', detail: 'Debug' },
    'debug_shadow_splits': { desc: '使用不同颜色绘制方向光阴影的每个分割（用于故障排除）', detail: 'Debug' },
    // Canvas Item
    'do_not_delay_visibility': { desc: '不延迟可见性（Canvas Item 专用）', detail: 'Canvas Item' }
};

// stencil_mode 有效选项（仅 spatial，Godot 4.x）
export const GODOT_SHADER_STENCIL_MODES: {[key: string]: string[]} = {
    'spatial': [
        'compare_always', 'compare_equal', 'compare_greater', 'compare_greater_or_equal',
        'compare_less', 'compare_less_or_equal', 'compare_not_equal',
        'read', 'write', 'write_if_depth_fail'
    ]
};

// stencil_mode 描述（Godot 4.x）
export const GODOT_SHADER_STENCIL_MODE_DESCRIPTIONS: {[key: string]: {desc: string, detail: string}} = {
    'read': { desc: '从模板缓冲区读取（仅在透明通道中有效）', detail: 'Operation' },
    'write': { desc: '将参考值写入模板缓冲区', detail: 'Operation' },
    'write_if_depth_fail': { desc: '深度测试失败时将参考值写入模板缓冲区', detail: 'Operation' },
    'compare_always': { desc: '始终通过模板测试', detail: 'Compare' },
    'compare_equal': { desc: '参考值等于模板缓冲区值时通过模板测试', detail: 'Compare' },
    'compare_greater': { desc: '参考值大于模板缓冲区值时通过模板测试', detail: 'Compare' },
    'compare_greater_or_equal': { desc: '参考值大于或等于模板缓冲区值时通过模板测试', detail: 'Compare' },
    'compare_less': { desc: '参考值小于模板缓冲区值时通过模板测试', detail: 'Compare' },
    'compare_less_or_equal': { desc: '参考值小于或等于模板缓冲区值时通过模板测试', detail: 'Compare' },
    'compare_not_equal': { desc: '参考值不等于模板缓冲区值时通过模板测试', detail: 'Compare' }
};

// shader_type 描述（字母序）
export const GODOT_SHADER_TYPE_DESCRIPTIONS: {[key: string]: {category: string, desc: string}} = {
    'canvas_item': { category: '2D', desc: '用于 2D 渲染的着色器。可以访问 UV、COLOR、TEXTURE 等 2D 特有变量。适用于 Sprite、Polygon2D、Line2D 等 2D 节点。' },
    'fog': { category: 'Fog', desc: '用于体积雾效果的着色器。可以控制雾的颜色、密度、发光等属性。需要配合 FogVolume 节点使用。' },
    'particles': { category: 'Particles', desc: '用于粒子系统的着色器。可以控制粒子的位置、颜色、大小等属性。需要配合 Particles 或 CPUParticles 节点使用。' },
    'sky': { category: 'Sky', desc: '用于渲染天空的着色器。可以访问 EYEDIR、SCREEN_UV、SKY_COORDS 等天空特有变量。用于创建动态天空、全景天空等效果。' },
    'spatial': { category: '3D', desc: '用于 3D 渲染的着色器。支持顶点变换、光照计算、阴影等 3D 功能。适用于 MeshInstance3D、CSG 等 3D 节点。' }
};

// Godot Shader 类型描述
export const GODOT_SHADER_TYPE_INFO: {[key: string]: {category: string, desc: string}} = {
    'void': { category: 'Basic', desc: '无返回值。用于声明不返回值的函数。' },
    'float': { category: 'Basic', desc: '单精度浮点数。适用于 scalar 值（时间、比例、强度等）。' },
    'int': { category: 'Basic', desc: '有符号 32 位整数。适用于计数、索引等。' },
    'uint': { category: 'Basic', desc: '无符号 32 位整数。' },
    'bool': { category: 'Basic', desc: '布尔值。true 或 false。' },
    'vec2': { category: 'Vector', desc: '2 分量浮点数向量。适用于 UV 坐标、2D 位置。' },
    'vec3': { category: 'Vector', desc: '3 分量浮点数向量。适用于颜色(RGB)、3D 位置、法线。' },
    'vec4': { category: 'Vector', desc: '4 分量浮点数向量。适用于颜色(RGBA)、齐次坐标。' },
    'ivec2': { category: 'Integer Vector', desc: '2 分量整型向量。' },
    'ivec3': { category: 'Integer Vector', desc: '3 分量整型向量。' },
    'ivec4': { category: 'Integer Vector', desc: '4 分量整型向量。' },
    'uvec2': { category: 'Unsigned Vector', desc: '2 分量无符号整型向量。' },
    'uvec3': { category: 'Unsigned Vector', desc: '3 分量无符号整型向量。' },
    'uvec4': { category: 'Unsigned Vector', desc: '4 分量无符号整型向量。' },
    'bvec2': { category: 'Boolean Vector', desc: '2 分量布尔向量。' },
    'bvec3': { category: 'Boolean Vector', desc: '3 分量布尔向量。' },
    'bvec4': { category: 'Boolean Vector', desc: '4 分量布尔向量。' },
    'mat2': { category: 'Matrix', desc: '2x2 浮点数矩阵（4 个元素）。' },
    'mat3': { category: 'Matrix', desc: '3x3 浮点数矩阵（9 个元素）。适用于 3x3 变换矩阵。' },
    'mat4': { category: 'Matrix', desc: '4x4 浮点数矩阵（16 个元素）。适用于模型/视图/投影矩阵。' },
    'sampler2D': { category: 'Sampler', desc: '2D 纹理采样器。用于读取 uniform 绑定的 2D 纹理。只能用于 uniform 声明。' },
    'samplerCube': { category: 'Sampler', desc: '立方体贴图采样器。用于读取环境贴图、天空盒纹理。只能用于 uniform 声明。' },
    'sampler2DArray': { category: 'Sampler', desc: '2D 纹理数组采样器。可同时访问多个纹理层。只能用于 uniform 声明。' },
    'samplerExternalOES': { category: 'Sampler', desc: '外部 OES 纹理采样器（Android/移动平台）。只能用于 uniform 声明。' }
};

// Godot Shader hint 描述（基于 Godot 4.x 官方文档）
export const GODOT_SHADER_HINT_INFO: {[key: string]: {category: string, desc: string}} = {
    // Color
    'source_color': { category: 'Color', desc: '标记为 sRGB 颜色数据（vec3/vec4/sampler2D 可用）。Forward+/Mobile 必需' },
    // Texture defaults
    'hint_default_white': { category: 'Texture Hint', desc: '纹理默认值为白色' },
    'hint_default_black': { category: 'Texture Hint', desc: '纹理默认值为黑色' },
    'hint_default_transparent': { category: 'Texture Hint', desc: '纹理默认值为透明' },
    // Texture type
    'hint_normal': { category: 'Texture Type', desc: '指定纹理为法线贴图' },
    'hint_depth_texture': { category: 'Texture Type', desc: '指定纹理为深度贴图' },
    'hint_screen_texture': { category: 'Texture Type', desc: '指定纹理为屏幕纹理' },
    'hint_anisotropy': { category: 'Texture Type', desc: '各向异性流图，默认流向为右' },
    'hint_normal_roughness_texture': { category: 'Texture Type', desc: '法线粗糙度纹理（仅 Forward+）' },
    // Roughness limiter
    'hint_roughness_r': { category: 'Roughness', desc: '粗糙度取自纹理 R 通道' },
    'hint_roughness_g': { category: 'Roughness', desc: '粗糙度取自纹理 G 通道' },
    'hint_roughness_b': { category: 'Roughness', desc: '粗糙度取自纹理 B 通道' },
    'hint_roughness_a': { category: 'Roughness', desc: '粗糙度取自纹理 A 通道' },
    'hint_roughness_normal': { category: 'Roughness', desc: '从法线贴图推导粗糙度（高频细节处增大粗糙度）' },
    'hint_roughness_gray': { category: 'Roughness', desc: '粗糙度取自纹理灰度值' },
    // Value range
    'hint_range': { category: 'Range', desc: '范围滑块。格式: hint_range(min, max[, step])。int/float 可用' },
    'hint_enum': { category: 'Enum', desc: '下拉枚举。格式: hint_enum("A", "B")。int 可用' },
    // String
    'hint_multiline_text': { category: 'String', desc: '多行文本输入框' },
    'hint_file': { category: 'String', desc: '文件路径选择器' },
    'hint_dir': { category: 'String', desc: '目录路径选择器' },
    // Texture filter
    'filter_nearest': { category: 'Filter', desc: '最近邻过滤（像素化）' },
    'filter_linear': { category: 'Filter', desc: '线性过滤（平滑）' },
    'filter_nearest_mipmap': { category: 'Filter', desc: '最近邻 + Mipmap' },
    'filter_linear_mipmap': { category: 'Filter', desc: '线性 + Mipmap' },
    // Texture repeat
    'repeat_enable': { category: 'Repeat', desc: '启用纹理重复（平铺）' },
    'repeat_disable': { category: 'Repeat', desc: '禁用纹理重复（钳制边缘）' },
    // Instance
    'instance_index': { category: 'Instance', desc: '指定 per-instance uniform 索引 (0-15)' },
};

// ============================================================================
// 内置变量作用域查询（变量 → 可用 shader_type 列表）
// ============================================================================

export const categoryShaderTypes: {[key: string]: string[]} = {
    'canvasitem': ['canvas_item'],
    'fog': ['fog'],
    'fog_global': ['fog'],
    'fragment_input': ['canvas_item', 'spatial'],
    'fragment_output': ['spatial'],
    'global': ['canvas_item', 'fog', 'particles', 'sky', 'spatial'],
    'light_input': ['spatial'],
    'light_output': ['spatial'],
    'particles_input': ['particles'],
    'particles_output': ['particles'],
    'sky': ['sky'],
    'sky_global': ['sky'],
    'vertex_bones': ['spatial'],
    'vertex_input': ['spatial'],
    'vertex_matrices': ['spatial'],
    'vertex_output': ['canvas_item', 'spatial'],
    'vertex_write': ['spatial']
};

// 缓存变量作用域
let scopeCache: Map<string, string[]> | null = null;

function buildScopeMap(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const [cat, types] of Object.entries(categoryShaderTypes)) {
        const vars = GODOT_SHADER_BUILTINS[cat];
        if (!Array.isArray(vars)) continue;
        for (const v of vars) {
            const existing = map.get(v.name);
            if (existing) {
                for (const t of types) if (!existing.includes(t)) existing.push(t);
            } else {
                map.set(v.name, [...types]);
            }
        }
    }
    return map;
}

/**
 * 获取内置变量可用的 shader_type 列表
 * @returns 如 ["canvas_item", "spatial"] 或 null（不是内置变量）
 */
export function getVariableShaderTypes(variableName: string): string[] | null {
    if (!scopeCache) scopeCache = buildScopeMap();
    return scopeCache.get(variableName) || null;
}

// ============================================================================
// 预计算的统一集合（避免各 feature 分散维护）
// ============================================================================

/** 关键字集合（供 highlight/rename 等复用） */
export const GODOT_SHADER_KEYWORD_SET: Set<string> = new Set(GODOT_SHADER_KEYWORDS.concat(['true', 'false']));

/** GLSL 内置函数名集合（供 rename 复用） */
export const GODOT_SHADER_GLSL_BUILTIN_SET: Set<string> = new Set(
    GODOT_SHADER_FUNCTIONS.map(f => f.name)
);

/** 内置变量名集合（从所有类别去重后构建） */
export const GODOT_SHADER_BUILTIN_NAME_SET: Set<string> = (() => {
    const s = new Set<string>();
    for (const cat of Object.values(GODOT_SHADER_BUILTINS)) {
        if (Array.isArray(cat)) {
            for (const v of cat) s.add(v.name);
        }
    }
    return s;
})();

/** 预去重的内置变量主列表（合并所有类别，用于补全一次性遍历） */
export const GODOT_SHADER_BUILTINS_MASTER: Array<{
    name: string; type: string; description: string;
}> = (() => {
    const seen = new Set<string>();
    const result: Array<{name: string; type: string; description: string}> = [];
    const pushCat = (cat: Array<{name: string; type: string; description: string}>) => {
        if (!Array.isArray(cat)) return;
        for (const v of cat) {
            if (seen.has(v.name)) continue;
            seen.add(v.name);
            result.push(v);
        }
    };
    const b = GODOT_SHADER_BUILTINS;
    // 按优先级排序：global 最优先，再按类别
    pushCat(b.global);
    pushCat(b.vertex_input);
    pushCat(b.vertex_output);
    pushCat(b.vertex_matrices);
    pushCat(b.vertex_bones);
    pushCat(b.vertex_write);
    pushCat(b.fragment_input);
    pushCat(b.fragment_output);
    pushCat(b.canvasitem);
    pushCat(b.sky_global);
    pushCat(b.sky);
    pushCat(b.fog_global);
    pushCat(b.fog);
    pushCat(b.particles_input);
    pushCat(b.particles_output);
    pushCat(b.light_input);
    pushCat(b.light_output);
    return result;
})();

// ============================================================================
// 内置函数返回值范围说明（供 hover 展示，支持中英双语）
// ============================================================================
export const GODOT_SHADER_FUNCTION_RETURNS: Record<string, { zh: string; en: string }> = {
    'sin': { zh: '[-1, 1]', en: '[-1, 1]' },
    'cos': { zh: '[-1, 1]', en: '[-1, 1]' },
    'tan': { zh: '(-∞, +∞)', en: '(-∞, +∞)' },
    'asin': { zh: '[-π/2, π/2]', en: '[-π/2, π/2]' },
    'acos': { zh: '[0, π]', en: '[0, π]' },
    'atan': { zh: '[-π, π]', en: '[-π, π]' },
    'sinh': { zh: '(-∞, +∞)', en: '(-∞, +∞)' },
    'cosh': { zh: '[1, +∞)', en: '[1, +∞)' },
    'tanh': { zh: '(-1, 1)', en: '(-1, 1)' },
    'pow': { zh: 'x^y', en: 'x^y' },
    'sqrt': { zh: '[0, +∞)', en: '[0, +∞)' },
    'inversesqrt': { zh: '(0, +∞)', en: '(0, +∞)' },
    'exp': { zh: '(0, +∞)', en: '(0, +∞)' },
    'exp2': { zh: '(0, +∞)', en: '(0, +∞)' },
    'log': { zh: '(-∞, +∞)', en: '(-∞, +∞)' },
    'log2': { zh: '(-∞, +∞)', en: '(-∞, +∞)' },
    'abs': { zh: '[0, +∞)', en: '[0, +∞)' },
    'sign': { zh: '{-1, 0, 1}', en: '{-1, 0, 1}' },
    'floor': { zh: '≤ x 的最大整数', en: 'largest integer ≤ x' },
    'ceil': { zh: '≥ x 的最小整数', en: 'smallest integer ≥ x' },
    'round': { zh: '最接近的整数', en: 'nearest integer' },
    'trunc': { zh: '向零取整', en: 'truncated toward zero' },
    'fract': { zh: '[0, 1)', en: '[0, 1)' },
    'mod': { zh: '[0, |y|)', en: '[0, |y|)' },
    'min': { zh: '较小者', en: 'the smaller of a, b' },
    'max': { zh: '较大者', en: 'the larger of a, b' },
    'clamp': { zh: '[min, max]', en: '[min, max]' },
    'mix': { zh: 'a + t·(b-a)', en: 'a + t·(b-a)' },
    'step': { zh: '{0, 1}', en: '{0, 1}' },
    'smoothstep': { zh: '[0, 1]', en: '[0, 1]' },
    'length': { zh: '[0, +∞)', en: '[0, +∞)' },
    'distance': { zh: '[0, +∞)', en: '[0, +∞)' },
    'dot': { zh: '标量', en: 'scalar' },
    'cross': { zh: '垂直向量', en: 'perpendicular vector' },
    'normalize': { zh: '单位向量', en: 'unit vector' },
    'reflect': { zh: '反射向量', en: 'reflected vector' },
    'refract': { zh: '折射向量', en: 'refracted vector' },
    'faceforward': { zh: '±N', en: '±N' },
    'determinant': { zh: '标量', en: 'scalar' },
    'transpose': { zh: '转置矩阵', en: 'transposed matrix' },
    'inverse': { zh: '逆矩阵', en: 'inverse matrix' },
    'outerProduct': { zh: '矩阵', en: 'matrix' },
    'radians': { zh: '弧度值', en: 'radians' },
    'degrees': { zh: '角度值', en: 'degrees' },
    'dFdx': { zh: '偏导数值', en: 'partial derivative' },
    'dFdy': { zh: '偏导数值', en: 'partial derivative' },
    'fwidth': { zh: '[0, +∞)', en: '[0, +∞)' },
    'texture': { zh: 'vec4 颜色', en: 'vec4 color' },
    'textureLod': { zh: 'vec4 颜色', en: 'vec4 color' },
    'textureProj': { zh: 'vec4 颜色', en: 'vec4 color' },
    'textureGrad': { zh: 'vec4 颜色', en: 'vec4 color' },
    'textureCube': { zh: 'vec4 颜色', en: 'vec4 color' },
    'textureCubeLod': { zh: 'vec4 颜色', en: 'vec4 color' },
    'textureArray': { zh: 'vec4 颜色', en: 'vec4 color' },
};
