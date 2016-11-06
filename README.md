### 淘宝，猫眼，格瓦拉影票信息抓取接口
1. node v7.0.0 及以上，并使用 `--harmony-async-await` 模式
2. 使用配置文件启动 mongoDB，根目录执行 `mongod -f .\db\db.conf` || `mongod --config .\db\db.conf`
3. 超级管理员
    1. 切换数据库 `use admin`
    2. 创建角色 `db.createUser({user:"root",pwd:"root",roles:["root"]})`
4. 所有数据库的读写账号
    1. 切换数据库 `use admin`
    2. 创建角色 `db.createUser({user:"admin",pwd:"admin",roles:["readWriteAnyDatabase"]})`
5. 当前数据库的读写账号 
    1. 切换数据库 `use movie`  
    2. 创建角色 `db.createUser({user:"api",pwd:"api",roles:["readWrite"]})`
    
    
#### 想法
1. 淘宝使用电影详情页面的链接获取影院票价等信息，需要城市相关信息的 cookie `tb_city`, `tb_cityName`
2. 格瓦拉使用电影详情页面的链接获取影院票价等信息，需要城市相关信息的 cookie `cityCode`